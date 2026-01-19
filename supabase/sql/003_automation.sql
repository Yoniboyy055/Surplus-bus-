-- Note: pg_cron extension is only available on Supabase Pro plan and higher
-- For projects without pg_cron, use an external cron service to call process_exclusive_expiries()
-- via Supabase Edge Functions or API
do $$
begin
  create extension if not exists pg_cron;
exception
  when insufficient_privilege then
    raise notice 'pg_cron extension requires elevated privileges. Use external cron service instead.';
  when others then
    raise notice 'pg_cron extension not available: %. Use external cron service instead.', sqlerrm;
end
$$;

create or replace function public.calc_tier(points int)
returns text
language sql
immutable
as $$
  select case
    when points >= 7 then 'elite'
    when points >= 3 then 'proven'
    else 'starter'
  end;
$$;

create or replace function public.calc_referrer_split(tier text)
returns int
language sql
immutable
as $$
  select case
    when tier = 'elite' then 30
    when tier = 'proven' then 25
    else 20
  end;
$$;

create or replace function public.calc_operator_split(referrer_split int)
returns int
language sql
immutable
as $$
  select 100 - referrer_split;
$$;

create or replace function public.add_audit_log(
  p_deal_id uuid,
  p_actor_role text,
  p_action text,
  p_from_status text,
  p_to_status text,
  p_metadata jsonb default null
)
returns void
language plpgsql
as $$
begin
  insert into public.audit_logs (deal_id, actor_profile_id, actor_role, action, from_status, to_status, metadata)
  values (
    p_deal_id,
    case when public.is_operator() then auth.uid() else null end,
    p_actor_role,
    p_action,
    p_from_status,
    p_to_status,
    p_metadata
  );
end;
$$;

-- Audit status changes
create or replace function public.trg_deals_audit_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    perform public.add_audit_log(new.id,
      case when public.is_operator() then 'operator' else 'system' end,
      'status_change', old.status, new.status, null);
  end if;
  return new;
end;
$$;

drop trigger if exists deals_audit_status on public.deals;
create trigger deals_audit_status after update on public.deals
for each row execute function public.trg_deals_audit_status();

-- When deal enters EXCLUSIVE_WINDOW_ACTIVE set deadline = now + 72h
create or replace function public.trg_deals_set_exclusive_window()
returns trigger language plpgsql as $$
begin
  if new.status = 'EXCLUSIVE_WINDOW_ACTIVE' and old.status is distinct from new.status then
    if new.exclusive_ends_at is null then
      new.exclusive_ends_at := now() + interval '72 hours';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists deals_set_exclusive_window on public.deals;
create trigger deals_set_exclusive_window before update on public.deals
for each row execute function public.trg_deals_set_exclusive_window();

-- Offer viewed -> set deal to OFFER_VIEWED if currently OFFER_SENT
create or replace function public.trg_offers_mark_viewed()
returns trigger language plpgsql as $$
declare v_status text;
begin
  if new.viewed_at is not null and old.viewed_at is null then
    select status into v_status from public.deals where id = new.deal_id;
    if v_status = 'OFFER_SENT' then
      update public.deals set status = 'OFFER_VIEWED' where id = new.deal_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists offers_mark_viewed on public.offers;
create trigger offers_mark_viewed after update on public.offers
for each row execute function public.trg_offers_mark_viewed();

-- WON_PENDING_CLOSE -> waiting for proof + operator verification (no auto)
-- CLOSED_PAID -> award points/tier and create payout record
create or replace function public.trg_deals_closed_paid_awards()
returns trigger language plpgsql as $$
declare v_points int; v_old_tier text; v_new_tier text; v_ref_split int; v_op_split int;
begin
  if old.status is distinct from new.status and new.status = 'CLOSED_PAID' then

    select points_closed_paid, tier into v_points, v_old_tier
    from public.referrers where profile_id = new.referrer_profile_id;

    v_points := v_points + 1;
    v_new_tier := public.calc_tier(v_points);

    update public.referrers
    set points_closed_paid = v_points,
        tier = v_new_tier,
        commission_rate = public.calc_referrer_split(v_new_tier)
    where profile_id = new.referrer_profile_id;

    if v_new_tier is distinct from v_old_tier then
      insert into public.referrer_tier_history(referrer_profile_id, from_tier, to_tier, reason)
      values (new.referrer_profile_id, v_old_tier, v_new_tier, 'points reached ' || v_points::text);
    end if;

    -- payout placeholder (amount computed later from winning bid)
    insert into public.payouts(deal_id, referrer_profile_id, status)
    values (new.id, new.referrer_profile_id, 'pending');

    -- positive rep
    insert into public.buyer_reputation_events(buyer_profile_id, deal_id, event_type, delta)
    values (new.buyer_profile_id, new.id, 'closed_paid', 5);

    update public.buyers
    set reputation_score = least(100, reputation_score + 5)
    where profile_id = new.buyer_profile_id;

  end if;
  return new;
end;
$$;

drop trigger if exists deals_closed_paid_awards on public.deals;
create trigger deals_closed_paid_awards after update on public.deals
for each row execute function public.trg_deals_closed_paid_awards();

-- Exclusive expiry processing (runs every 10 minutes)
create or replace function public.process_exclusive_expiries()
returns void language plpgsql as $$
declare rec record;
begin
  for rec in
    select id, buyer_profile_id, exclusive_reset_count
    from public.deals
    where status = 'EXCLUSIVE_WINDOW_ACTIVE'
      and exclusive_ends_at is not null
      and exclusive_ends_at <= now()
  loop
    update public.deals
    set status = 'MATCHING',
        exclusive_reset_count = rec.exclusive_reset_count + 1,
        exclusive_ends_at = null
    where id = rec.id;

    insert into public.buyer_reputation_events(buyer_profile_id, deal_id, event_type, delta)
    values (rec.buyer_profile_id, rec.id, 'window_expired', -10);

    update public.buyers
    set reputation_score = greatest(0, reputation_score - 10)
    where profile_id = rec.buyer_profile_id;

    if (rec.exclusive_reset_count + 1) >= 3 then
      update public.buyers set track = 'B' where profile_id = rec.buyer_profile_id;
    end if;
  end loop;
end;
$$;

-- Schedule the cron job only if pg_cron extension is available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Unschedule existing job if it exists
    perform cron.unschedule('process_exclusive_expiries_every_10m');
    
    -- Schedule new job
    perform cron.schedule(
      'process_exclusive_expiries_every_10m',
      '*/10 * * * *',
      $$select public.process_exclusive_expiries();$$
    );
    raise notice 'Cron job scheduled successfully';
  else
    raise notice 'pg_cron not available. Set up external cron to call process_exclusive_expiries() every 10 minutes.';
  end if;
exception
  when others then
    raise notice 'Could not schedule cron job: %. Use external cron service instead.', sqlerrm;
end
$$;
