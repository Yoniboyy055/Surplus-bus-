CREATE OR REPLACE FUNCTION public.acquire_parser_lock(p_parser_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_key BIGINT;
BEGIN
  v_key := hashtext(p_parser_key);
  RETURN pg_try_advisory_lock(v_key);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.add_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.add_audit_log(p_deal_id uuid, p_actor_role text, p_action text, p_from_status text, p_to_status text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_logs (deal_id, actor_profile_id, actor_role, action, from_status, to_status, metadata)
  VALUES (
    p_deal_id,
    CASE WHEN public.is_operator() THEN auth.uid() ELSE NULL END,
    p_actor_role,
    p_action,
    p_from_status,
    p_to_status,
    p_metadata
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.beta_signups_normalize_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.block_canonical_from_unqualified_source()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_production_ready boolean;
  v_parser_key       text;
BEGIN
  IF NEW.source_id IS NULL THEN
    RETURN NEW; -- manual insert allowed
  END IF;

  SELECT production_ready, parser_key
    INTO v_production_ready, v_parser_key
  FROM public.sources
  WHERE id = NEW.source_id;

  IF v_production_ready = false THEN
    RAISE EXCEPTION
      '[SURPLUS BUS] BLOCKED: Source "%" is not production_ready. Cannot write to canonical_lots until qualification gate passes.',
      v_parser_key;
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calc_operator_split()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calc_operator_split(referrer_split integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 100 - referrer_split;
$function$
;
CREATE OR REPLACE FUNCTION public.calc_referrer_split()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calc_referrer_split(tier text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN tier = 'elite' THEN 30
    WHEN tier = 'proven' THEN 25
    ELSE 20
  END;
$function$
;
CREATE OR REPLACE FUNCTION public.calc_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calc_tier(points integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN points >= 7 THEN 'elite'
    WHEN points >= 3 THEN 'proven'
    ELSE 'starter'
  END;
$function$
;
CREATE OR REPLACE FUNCTION public.check_terminal_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if old.status in ('CLOSED_PAID', 'LOST', 'WITHDRAWN') and new.status <> old.status then
    raise exception 'Cannot change status from a terminal state (%)', old.status;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.enforce_snapshot_traceability()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.source_run_id is null or new.source_record_id is null then
      raise exception 'lot_snapshots requires source_run_id and source_record_id';
        end if;
          return new;
          end;
          $function$
;
CREATE OR REPLACE FUNCTION public.get_project_fingerprint()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  db text;
  addr text;
  usr text;
BEGIN
  db := current_database();
  addr := inet_server_addr()::text;
  usr := current_user;
  RETURN jsonb_build_object('current_database', db, 'inet_server_addr', addr, 'current_user', usr);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_production_source_writes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_production_ready boolean;
  v_quality_state    text;
  v_parser_key       text;
BEGIN
  SELECT production_ready, quality_state, parser_key
    INTO v_production_ready, v_quality_state, v_parser_key
  FROM public.sources
  WHERE id = NEW.source_id;

  IF v_production_ready = false THEN
    RAISE WARNING
      '[SURPLUS BUS] Source "%" (state: %) is not production_ready. Write to source_records allowed but canonical promotion is blocked. Set production_ready=true after qualification gate passes.',
      v_parser_key, v_quality_state;
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_terminal_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.final_price IS NOT NULL AND NEW.final_price IS NOT NULL
     AND OLD.final_price <> NEW.final_price THEN
    RAISE EXCEPTION
      'final_price is immutable once set on lot %. Use correction path: null then re-set.',
      OLD.id;
  END IF;
  IF OLD.outcome IS NOT NULL AND NEW.outcome IS NOT NULL
     AND OLD.outcome <> NEW.outcome THEN
    RAISE EXCEPTION
      'outcome is immutable once set on lot %. Use correction path: null then re-set.',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'buyer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_reputation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reputation_score < 20 THEN
    UPDATE public.buyers SET track = 'B' WHERE profile_id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ingest_gsa_lot_snapshot(p_source_id uuid, p_source_run_id uuid, p_source_record_id uuid, p_auction_canonical_key text, p_external_auction_id text, p_auction_title text, p_seller_name text, p_jurisdiction text, p_auction_type text, p_auction_status text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_closed_at timestamp with time zone, p_lot_canonical_key text, p_external_lot_id text, p_lot_number text, p_lot_title text, p_description text, p_category text, p_location_text text, p_condition_text text, p_quantity numeric, p_unit text, p_current_price numeric, p_buy_now_price numeric, p_reserve_price numeric, p_currency text, p_bid_count integer, p_lot_status text, p_listing_url text, p_closes_at timestamp with time zone, p_sold_at timestamp with time zone, p_snapshot_hash text, p_raw_payload jsonb, p_observed_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(canonical_auction_id uuid, canonical_lot_id uuid, lot_snapshot_id uuid, inserted_snapshot boolean)
 LANGUAGE plpgsql
AS $function$
                                                                                      declare
                                                                                        v_auction_id uuid;
                                                                                          v_lot_id uuid;
                                                                                            v_snapshot_id uuid;
                                                                                            begin
                                                                                              if p_source_id is null or p_source_run_id is null or p_source_record_id is null then
                                                                                                  raise exception 'source_id, source_run_id, source_record_id are required';
                                                                                                    end if;

                                                                                                      if p_auction_canonical_key is null or p_lot_canonical_key is null then
                                                                                                          raise exception 'auction_canonical_key and lot_canonical_key are required';
                                                                                                            end if;

                                                                                                              if p_snapshot_hash is null then
                                                                                                                  raise exception 'snapshot_hash is required';
                                                                                                                    end if;

                                                                                                                      -- 1) Upsert canonical_auction by canonical_key
                                                                                                                        insert into public.canonical_auctions (
                                                                                                                            source_id,
                                                                                                                                primary_source_record_id,
                                                                                                                                    canonical_key,
                                                                                                                                        external_auction_id,
                                                                                                                                            title,
                                                                                                                                                seller_name,
                                                                                                                                                    jurisdiction,
                                                                                                                                                        auction_type,
                                                                                                                                                            status,
                                                                                                                                                                starts_at,
                                                                                                                                                                    ends_at,
                                                                                                                                                                        closed_at,
                                                                                                                                                                            source_first_seen_at,
                                                                                                                                                                                source_last_seen_at
                                                                                                                                                                                  )
                                                                                                                                                                                    values (
                                                                                                                                                                                        p_source_id,
                                                                                                                                                                                            p_source_record_id,
                                                                                                                                                                                                p_auction_canonical_key,
                                                                                                                                                                                                    p_external_auction_id,
                                                                                                                                                                                                        p_auction_title,
                                                                                                                                                                                                            p_seller_name,
                                                                                                                                                                                                                p_jurisdiction,
                                                                                                                                                                                                                    p_auction_type,
                                                                                                                                                                                                                        p_auction_status,
                                                                                                                                                                                                                            p_starts_at,
                                                                                                                                                                                                                                p_ends_at,
                                                                                                                                                                                                                                    p_closed_at,
                                                                                                                                                                                                                                        p_observed_at,
                                                                                                                                                                                                                                            p_observed_at
                                                                                                                                                                                                                                              )
                                                                                                                                                                                                                                                on conflict (canonical_key) do update set
                                                                                                                                                                                                                                                    primary_source_record_id = excluded.primary_source_record_id,
                                                                                                                                                                                                                                                        external_auction_id      = coalesce(excluded.external_auction_id, public.canonical_auctions.external_auction_id),
                                                                                                                                                                                                                                                            title                    = coalesce(excluded.title, public.canonical_auctions.title),
                                                                                                                                                                                                                                                                seller_name              = coalesce(excluded.seller_name, public.canonical_auctions.seller_name),
                                                                                                                                                                                                                                                                    jurisdiction             = coalesce(excluded.jurisdiction, public.canonical_auctions.jurisdiction),
                                                                                                                                                                                                                                                                        auction_type             = coalesce(excluded.auction_type, public.canonical_auctions.auction_type),
                                                                                                                                                                                                                                                                            status                   = coalesce(excluded.status, public.canonical_auctions.status),
                                                                                                                                                                                                                                                                                starts_at                = coalesce(excluded.starts_at, public.canonical_auctions.starts_at),
                                                                                                                                                                                                                                                                                    ends_at                  = coalesce(excluded.ends_at, public.canonical_auctions.ends_at),
                                                                                                                                                                                                                                                                                        closed_at                = coalesce(excluded.closed_at, public.canonical_auctions.closed_at),
                                                                                                                                                                                                                                                                                            source_first_seen_at     = least(public.canonical_auctions.source_first_seen_at, excluded.source_first_seen_at),
                                                                                                                                                                                                                                                                                                source_last_seen_at      = greatest(public.canonical_auctions.source_last_seen_at, excluded.source_last_seen_at)
                                                                                                                                                                                                                                                                                                  returning id into v_auction_id;

                                                                                                                                                                                                                                                                                                    -- 2) Upsert canonical_lot by canonical_key
                                                                                                                                                                                                                                                                                                      insert into public.canonical_lots (
                                                                                                                                                                                                                                                                                                          canonical_auction_id,
                                                                                                                                                                                                                                                                                                              source_id,
                                                                                                                                                                                                                                                                                                                  primary_source_record_id,
                                                                                                                                                                                                                                                                                                                      canonical_key,
                                                                                                                                                                                                                                                                                                                          external_lot_id,
                                                                                                                                                                                                                                                                                                                              lot_number,
                                                                                                                                                                                                                                                                                                                                  title,
                                                                                                                                                                                                                                                                                                                                      description,
                                                                                                                                                                                                                                                                                                                                          category,
                                                                                                                                                                                                                                                                                                                                              location_text,
                                                                                                                                                                                                                                                                                                                                                  condition_text,
                                                                                                                                                                                                                                                                                                                                                      quantity,
                                                                                                                                                                                                                                                                                                                                                          unit,
                                                                                                                                                                                                                                                                                                                                                              current_price,
                                                                                                                                                                                                                                                                                                                                                                  buy_now_price,
                                                                                                                                                                                                                                                                                                                                                                      reserve_price,
                                                                                                                                                                                                                                                                                                                                                                          currency,
                                                                                                                                                                                                                                                                                                                                                                              bid_count,
                                                                                                                                                                                                                                                                                                                                                                                  status,
                                                                                                                                                                                                                                                                                                                                                                                      listing_url,
                                                                                                                                                                                                                                                                                                                                                                                          closes_at,
                                                                                                                                                                                                                                                                                                                                                                                              sold_at,
                                                                                                                                                                                                                                                                                                                                                                                                  source_first_seen_at,
                                                                                                                                                                                                                                                                                                                                                                                                      source_last_seen_at
                                                                                                                                                                                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                                                                                                                                                                                          values (
                                                                                                                                                                                                                                                                                                                                                                                                              v_auction_id,
                                                                                                                                                                                                                                                                                                                                                                                                                  p_source_id,
                                                                                                                                                                                                                                                                                                                                                                                                                      p_source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                          p_lot_canonical_key,
                                                                                                                                                                                                                                                                                                                                                                                                                              p_external_lot_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                  p_lot_number,
                                                                                                                                                                                                                                                                                                                                                                                                                                      p_lot_title,
                                                                                                                                                                                                                                                                                                                                                                                                                                          p_description,
                                                                                                                                                                                                                                                                                                                                                                                                                                              p_category,
                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_location_text,
                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_condition_text,
                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_quantity,
                                                                                                                                                                                                                                                                                                                                                                                                                                                              p_unit,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_current_price,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_buy_now_price,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_reserve_price,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p_currency,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_bid_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_lot_status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_listing_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p_closes_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_sold_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_observed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_observed_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              on conflict (canonical_key) do update set
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  canonical_auction_id     = excluded.canonical_auction_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      primary_source_record_id = excluded.primary_source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          external_lot_id          = coalesce(excluded.external_lot_id, public.canonical_lots.external_lot_id),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              lot_number               = coalesce(excluded.lot_number, public.canonical_lots.lot_number),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  title                    = coalesce(excluded.title, public.canonical_lots.title),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      description              = coalesce(excluded.description, public.canonical_lots.description),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          category                 = coalesce(excluded.category, public.canonical_lots.category),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              location_text            = coalesce(excluded.location_text, public.canonical_lots.location_text),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  condition_text           = coalesce(excluded.condition_text, public.canonical_lots.condition_text),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      quantity                 = coalesce(excluded.quantity, public.canonical_lots.quantity),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          unit                     = coalesce(excluded.unit, public.canonical_lots.unit),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              current_price            = coalesce(excluded.current_price, public.canonical_lots.current_price),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  buy_now_price            = coalesce(excluded.buy_now_price, public.canonical_lots.buy_now_price),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      reserve_price            = coalesce(excluded.reserve_price, public.canonical_lots.reserve_price),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          currency                 = coalesce(excluded.currency, public.canonical_lots.currency),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              bid_count                = coalesce(excluded.bid_count, public.canonical_lots.bid_count),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  status                   = coalesce(excluded.status, public.canonical_lots.status),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      listing_url              = coalesce(excluded.listing_url, public.canonical_lots.listing_url),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          closes_at                = coalesce(excluded.closes_at, public.canonical_lots.closes_at),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              sold_at                  = coalesce(excluded.sold_at, public.canonical_lots.sold_at),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  source_first_seen_at     = least(public.canonical_lots.source_first_seen_at, excluded.source_first_seen_at),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      source_last_seen_at      = greatest(public.canonical_lots.source_last_seen_at, excluded.source_last_seen_at)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        returning id into v_lot_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          -- 3) Insert snapshot (idempotent via unique(canonical_lot_id, snapshot_hash))
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            insert into public.lot_snapshots (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                canonical_lot_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    source_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        source_run_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                snapshot_hash,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    raw_payload,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        observed_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            values (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                v_lot_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    p_source_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        p_source_run_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            p_source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                p_snapshot_hash,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    p_raw_payload,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        p_observed_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            on conflict (canonical_lot_id, snapshot_hash) do nothing
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              returning id into v_snapshot_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                canonical_auction_id := v_auction_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  canonical_lot_id := v_lot_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    if v_snapshot_id is null then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        -- already existed
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            lot_snapshot_id := null;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                inserted_snapshot := false;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  else
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      lot_snapshot_id := v_snapshot_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          inserted_snapshot := true;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            end if;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              return next;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              $function$
;
CREATE OR REPLACE FUNCTION public.ingest_gsa_lot_snapshot(p_source_id uuid, p_source_run_id uuid, p_source_record_id uuid, p_auction_canonical_key text, p_external_auction_id text, p_auction_title text, p_seller_name text, p_jurisdiction text, p_auction_type text, p_auction_status text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_closed_at timestamp with time zone, p_lot_canonical_key text, p_external_lot_id text, p_lot_number text, p_lot_title text, p_description text, p_category text, p_location_text text, p_condition_text text, p_quantity numeric, p_unit text, p_currency text, p_listing_url text, p_snapshot_hash text, p_observed_at timestamp with time zone, p_status text, p_current_price numeric, p_bid_count integer, p_closes_at timestamp with time zone, p_is_terminal boolean, p_normalized_payload jsonb)
 RETURNS TABLE(canonical_auction_id uuid, canonical_lot_id uuid, lot_snapshot_id uuid, inserted_snapshot boolean)
 LANGUAGE plpgsql
AS $function$
                                                                                  declare
                                                                                    v_auction_id uuid;
                                                                                      v_lot_id uuid;
                                                                                        v_snapshot_id uuid;
                                                                                        begin
                                                                                          -- hard requirements for traceability
                                                                                            if p_source_id is null or p_source_run_id is null or p_source_record_id is null then
                                                                                                raise exception 'source_id, source_run_id, source_record_id are required';
                                                                                                  end if;

                                                                                                    if p_auction_canonical_key is null or p_lot_canonical_key is null then
                                                                                                        raise exception 'auction_canonical_key and lot_canonical_key are required';
                                                                                                          end if;

                                                                                                            if p_snapshot_hash is null then
                                                                                                                raise exception 'snapshot_hash is required';
                                                                                                                  end if;

                                                                                                                    if p_observed_at is null then
                                                                                                                        p_observed_at := now();
                                                                                                                          end if;

                                                                                                                            -- 1) Upsert canonical_auction (requires unique on canonical_key)
                                                                                                                              insert into public.canonical_auctions (
                                                                                                                                  source_id,
                                                                                                                                      primary_source_record_id,
                                                                                                                                          canonical_key,
                                                                                                                                              external_auction_id,
                                                                                                                                                  title,
                                                                                                                                                      seller_name,
                                                                                                                                                          jurisdiction,
                                                                                                                                                              auction_type,
                                                                                                                                                                  status,
                                                                                                                                                                      starts_at,
                                                                                                                                                                          ends_at,
                                                                                                                                                                              closed_at,
                                                                                                                                                                                  source_first_seen_at,
                                                                                                                                                                                      source_last_seen_at
                                                                                                                                                                                        )
                                                                                                                                                                                          values (
                                                                                                                                                                                              p_source_id,
                                                                                                                                                                                                  p_source_record_id,
                                                                                                                                                                                                      p_auction_canonical_key,
                                                                                                                                                                                                          p_external_auction_id,
                                                                                                                                                                                                              p_auction_title,
                                                                                                                                                                                                                  p_seller_name,
                                                                                                                                                                                                                      p_jurisdiction,
                                                                                                                                                                                                                          p_auction_type,
                                                                                                                                                                                                                              p_auction_status,
                                                                                                                                                                                                                                  p_starts_at,
                                                                                                                                                                                                                                      p_ends_at,
                                                                                                                                                                                                                                          p_closed_at,
                                                                                                                                                                                                                                              p_observed_at,
                                                                                                                                                                                                                                                  p_observed_at
                                                                                                                                                                                                                                                    )
                                                                                                                                                                                                                                                      on conflict (canonical_key) do update set
                                                                                                                                                                                                                                                          primary_source_record_id = excluded.primary_source_record_id,
                                                                                                                                                                                                                                                              external_auction_id      = coalesce(excluded.external_auction_id, public.canonical_auctions.external_auction_id),
                                                                                                                                                                                                                                                                  title                    = coalesce(excluded.title, public.canonical_auctions.title),
                                                                                                                                                                                                                                                                      seller_name              = coalesce(excluded.seller_name, public.canonical_auctions.seller_name),
                                                                                                                                                                                                                                                                          jurisdiction             = coalesce(excluded.jurisdiction, public.canonical_auctions.jurisdiction),
                                                                                                                                                                                                                                                                              auction_type             = coalesce(excluded.auction_type, public.canonical_auctions.auction_type),
                                                                                                                                                                                                                                                                                  status                   = coalesce(excluded.status, public.canonical_auctions.status),
                                                                                                                                                                                                                                                                                      starts_at                = coalesce(excluded.starts_at, public.canonical_auctions.starts_at),
                                                                                                                                                                                                                                                                                          ends_at                  = coalesce(excluded.ends_at, public.canonical_auctions.ends_at),
                                                                                                                                                                                                                                                                                              closed_at                = coalesce(excluded.closed_at, public.canonical_auctions.closed_at),
                                                                                                                                                                                                                                                                                                  source_first_seen_at     = least(public.canonical_auctions.source_first_seen_at, excluded.source_first_seen_at),
                                                                                                                                                                                                                                                                                                      source_last_seen_at      = greatest(public.canonical_auctions.source_last_seen_at, excluded.source_last_seen_at)
                                                                                                                                                                                                                                                                                                        returning id into v_auction_id;

                                                                                                                                                                                                                                                                                                          -- 2) Upsert canonical_lot (requires unique on canonical_key)
                                                                                                                                                                                                                                                                                                            insert into public.canonical_lots (
                                                                                                                                                                                                                                                                                                                canonical_auction_id,
                                                                                                                                                                                                                                                                                                                    source_id,
                                                                                                                                                                                                                                                                                                                        primary_source_record_id,
                                                                                                                                                                                                                                                                                                                            canonical_key,
                                                                                                                                                                                                                                                                                                                                external_lot_id,
                                                                                                                                                                                                                                                                                                                                    lot_number,
                                                                                                                                                                                                                                                                                                                                        title,
                                                                                                                                                                                                                                                                                                                                            description,
                                                                                                                                                                                                                                                                                                                                                category,
                                                                                                                                                                                                                                                                                                                                                    location_text,
                                                                                                                                                                                                                                                                                                                                                        condition_text,
                                                                                                                                                                                                                                                                                                                                                            quantity,
                                                                                                                                                                                                                                                                                                                                                                unit,
                                                                                                                                                                                                                                                                                                                                                                    currency,
                                                                                                                                                                                                                                                                                                                                                                        listing_url,
                                                                                                                                                                                                                                                                                                                                                                            source_first_seen_at,
                                                                                                                                                                                                                                                                                                                                                                                source_last_seen_at
                                                                                                                                                                                                                                                                                                                                                                                  )
                                                                                                                                                                                                                                                                                                                                                                                    values (
                                                                                                                                                                                                                                                                                                                                                                                        v_auction_id,
                                                                                                                                                                                                                                                                                                                                                                                            p_source_id,
                                                                                                                                                                                                                                                                                                                                                                                                p_source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                    p_lot_canonical_key,
                                                                                                                                                                                                                                                                                                                                                                                                        p_external_lot_id,
                                                                                                                                                                                                                                                                                                                                                                                                            p_lot_number,
                                                                                                                                                                                                                                                                                                                                                                                                                p_lot_title,
                                                                                                                                                                                                                                                                                                                                                                                                                    p_description,
                                                                                                                                                                                                                                                                                                                                                                                                                        p_category,
                                                                                                                                                                                                                                                                                                                                                                                                                            p_location_text,
                                                                                                                                                                                                                                                                                                                                                                                                                                p_condition_text,
                                                                                                                                                                                                                                                                                                                                                                                                                                    p_quantity,
                                                                                                                                                                                                                                                                                                                                                                                                                                        p_unit,
                                                                                                                                                                                                                                                                                                                                                                                                                                            p_currency,
                                                                                                                                                                                                                                                                                                                                                                                                                                                p_listing_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                    p_observed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                        p_observed_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                          )
                                                                                                                                                                                                                                                                                                                                                                                                                                                            on conflict (canonical_key) do update set
                                                                                                                                                                                                                                                                                                                                                                                                                                                                canonical_auction_id     = excluded.canonical_auction_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    primary_source_record_id = excluded.primary_source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        external_lot_id          = coalesce(excluded.external_lot_id, public.canonical_lots.external_lot_id),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            lot_number               = coalesce(excluded.lot_number, public.canonical_lots.lot_number),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                title                    = coalesce(excluded.title, public.canonical_lots.title),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    description              = coalesce(excluded.description, public.canonical_lots.description),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        category                 = coalesce(excluded.category, public.canonical_lots.category),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            location_text            = coalesce(excluded.location_text, public.canonical_lots.location_text),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                condition_text           = coalesce(excluded.condition_text, public.canonical_lots.condition_text),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    quantity                 = coalesce(excluded.quantity, public.canonical_lots.quantity),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        unit                     = coalesce(excluded.unit, public.canonical_lots.unit),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            currency                 = coalesce(excluded.currency, public.canonical_lots.currency),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                listing_url              = coalesce(excluded.listing_url, public.canonical_lots.listing_url),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    source_first_seen_at     = least(public.canonical_lots.source_first_seen_at, excluded.source_first_seen_at),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        source_last_seen_at      = greatest(public.canonical_lots.source_last_seen_at, excluded.source_last_seen_at)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          returning id into v_lot_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            -- 3) Insert snapshot (MATCHES your lot_snapshots schema)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              insert into public.lot_snapshots (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  canonical_lot_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      source_run_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              observed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  snapshot_hash,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          current_price,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              bid_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  closes_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      is_terminal,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          normalized_payload
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              values (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  v_lot_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_source_run_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_source_record_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p_observed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_snapshot_hash,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_current_price,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p_bid_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_closes_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p_is_terminal,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p_normalized_payload
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              on conflict (canonical_lot_id, snapshot_hash) do nothing
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                returning id into v_snapshot_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  canonical_auction_id := v_auction_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    canonical_lot_id := v_lot_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      if v_snapshot_id is null then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          lot_snapshot_id := null;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              inserted_snapshot := false;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                else
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    lot_snapshot_id := v_snapshot_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        inserted_snapshot := true;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          end if;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            return next;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            $function$
;
CREATE OR REPLACE FUNCTION public.is_operator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'operator'
  );
$function$
;
CREATE OR REPLACE FUNCTION public.last_run_per_parser()
 RETURNS TABLE(parser_key text, last_started_at timestamp with time zone, last_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    s.parser_key,
    max(r.started_at) AS last_started_at,
    (array_agg(r.status ORDER BY r.started_at DESC))[1] AS last_status
  FROM public.source_runs r
  JOIN public.sources s ON s.id = r.source_id
  GROUP BY s.parser_key
  ORDER BY last_started_at DESC;
$function$
;
CREATE OR REPLACE FUNCTION public.process_exclusive_expiries()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT id, buyer_profile_id, exclusive_reset_count
    FROM public.deals
    WHERE status = 'EXCLUSIVE_WINDOW_ACTIVE'
      AND exclusive_ends_at IS NOT NULL
      AND exclusive_ends_at <= now()
  LOOP
    UPDATE public.deals
    SET status = 'MATCHING',
        exclusive_reset_count = rec.exclusive_reset_count + 1,
        exclusive_ends_at = NULL
    WHERE id = rec.id;

    INSERT INTO public.buyer_reputation_events(buyer_profile_id, deal_id, event_type, delta)
    VALUES (rec.buyer_profile_id, rec.id, 'window_expired', -10);

    UPDATE public.buyers
    SET reputation_score = greatest(0, reputation_score - 10)
    WHERE profile_id = rec.buyer_profile_id;

    IF (rec.exclusive_reset_count + 1) >= 3 THEN
      UPDATE public.buyers SET track = 'B' WHERE profile_id = rec.buyer_profile_id;
    END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.promote_intake_to_source_records(p_intake_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_record       surplus_intake_v1%ROWTYPE;
  v_source_id    uuid;
  v_new_sr_id    uuid;
  v_url_hash     text;
  v_payload_hash text;
  v_existing_id  uuid;

  v_promoted     int := 0;
  v_skipped      int := 0;
  v_failed       int := 0;
  v_skipped_reasons jsonb := '[]'::jsonb;
  v_failed_reasons  jsonb := '[]'::jsonb;

  v_intake_cursor CURSOR FOR
    SELECT * FROM surplus_intake_v1
    WHERE promoted = false
      AND (p_intake_ids IS NULL OR id = ANY(p_intake_ids))
    ORDER BY collected_at ASC;
BEGIN

  OPEN v_intake_cursor;

  LOOP
    FETCH v_intake_cursor INTO v_record;
    EXIT WHEN NOT FOUND;

    -- ââ Gate 1: title and listing_url must be present (schema enforces NOT NULL but double-check)
    IF v_record.listing_url IS NULL OR trim(v_record.listing_url) = '' THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id, 'reason', 'missing listing_url'
      );
      CONTINUE;
    END IF;

    IF v_record.title IS NULL OR trim(v_record.title) = '' THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id, 'reason', 'missing title'
      );
      CONTINUE;
    END IF;

    -- ââ Gate 2: Resolve source_id from sources table via parser_key = source_name
    SELECT id INTO v_source_id
    FROM sources
    WHERE parser_key = v_record.source_name
    LIMIT 1;

    IF v_source_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id,
        'reason', 'no matching source for source_name: ' || coalesce(v_record.source_name, 'null')
      );
      CONTINUE;
    END IF;

    -- ââ Gate 3: Status must be active or upcoming (not closed/awarded)
    IF v_record.status IN ('closed', 'awarded') THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id, 'reason', 'status is terminal: ' || v_record.status
      );
      CONTINUE;
    END IF;

    -- ââ Compute hashes
    v_url_hash     := encode(digest(lower(trim(v_record.listing_url)), 'sha256'), 'hex');
    v_payload_hash := encode(digest(
      coalesce(v_record.title,'') ||
      coalesce(v_record.external_id,'') ||
      coalesce(v_record.listing_url,'') ||
      coalesce(v_record.status,'') ||
      coalesce(v_record.current_price::text,''),
      'sha256'
    ), 'hex');

    -- ââ Gate 4: Dedup check
    -- If external_id present: check for existing source_record with same source + external_id
    -- If no external_id: check by url_hash
    IF v_record.external_id IS NOT NULL THEN
      SELECT id INTO v_existing_id
      FROM source_records
      WHERE source_id = v_source_id
        AND external_id = v_record.external_id
      LIMIT 1;
    ELSE
      SELECT id INTO v_existing_id
      FROM source_records
      WHERE source_url_hash = v_url_hash
      LIMIT 1;
    END IF;

    IF v_existing_id IS NOT NULL THEN
      -- Already in source_records â mark as promoted to existing record, skip insert
      UPDATE surplus_intake_v1
      SET promoted = true,
          promoted_at = now(),
          promoted_to_id = v_existing_id
      WHERE id = v_record.id;

      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id,
        'reason', 'duplicate â already in source_records as ' || v_existing_id
      );
      CONTINUE;
    END IF;

    -- ââ Insert into source_records
    BEGIN
      INSERT INTO source_records (
        source_id,
        source_run_id,
        external_id,
        source_url,
        source_url_normalized,
        source_url_hash,
        raw_payload,
        payload_hash,
        first_seen_at,
        last_seen_at,
        is_deleted,
        dedup_flag
      )
      VALUES (
        v_source_id,
        NULL,  -- no source_run for manual intake â intake_run_id not yet FK'd to source_runs
        v_record.external_id,
        v_record.listing_url,
        lower(trim(v_record.listing_url)),
        v_url_hash,
        jsonb_build_object(
          'intake_id',       v_record.id,
          'title',           v_record.title,
          'description',     v_record.description,
          'category',        v_record.category,
          'subcategory',     v_record.subcategory,
          'status',          v_record.status,
          'current_price',   v_record.current_price,
          'starting_price',  v_record.starting_price,
          'estimated_value', v_record.estimated_value,
          'currency',        v_record.currency,
          'bid_count',       v_record.bid_count,
          'closes_at',       v_record.closes_at,
          'province_state',  v_record.province_state,
          'city',            v_record.city,
          'asset_type',      v_record.asset_type,
          'brand',           v_record.brand,
          'model',           v_record.model,
          'year',            v_record.year,
          'agency_name',     v_record.agency_name,
          'collector_name',  v_record.collector_name,
          'collection_method', v_record.collection_method,
          'confidence_score',  v_record.confidence_score,
          'notes',           v_record.notes
        ),
        v_payload_hash,
        coalesce(v_record.collected_at, now()),
        coalesce(v_record.last_seen_at, now()),
        false,
        'intake_promoted'
      )
      RETURNING id INTO v_new_sr_id;

      -- Mark intake record as promoted
      UPDATE surplus_intake_v1
      SET promoted      = true,
          promoted_at   = now(),
          promoted_to_id = v_new_sr_id
      WHERE id = v_record.id;

      v_promoted := v_promoted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_failed_reasons := v_failed_reasons || jsonb_build_object(
        'id', v_record.id,
        'reason', SQLERRM
      );
    END;

  END LOOP;

  CLOSE v_intake_cursor;

  RETURN jsonb_build_object(
    'promoted', v_promoted,
    'skipped',  v_skipped,
    'failed',   v_failed,
    'skipped_detail', v_skipped_reasons,
    'failed_detail',  v_failed_reasons,
    'run_at', now()
  );

END;
$function$
;
CREATE OR REPLACE FUNCTION public.release_parser_lock(p_parser_key text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_key BIGINT;
BEGIN
  v_key := hashtext(p_parser_key);
  PERFORM pg_advisory_unlock(v_key);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.source_records_audit_trig()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.source_records_audit(change_type, changed_by, record_id, source_id, data)
    VALUES ('DELETE', current_setting('app.current_user', true), OLD.id, OLD.source_id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.source_records_audit(change_type, changed_by, record_id, source_id, data)
    VALUES ('UPDATE', current_setting('app.current_user', true), NEW.id, NEW.source_id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.source_records_audit(change_type, changed_by, record_id, source_id, data)
    VALUES ('INSERT', current_setting('app.current_user', true), NEW.id, NEW.source_id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trg_deals_audit_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if new.status is distinct from old.status then
    perform public.add_audit_log(new.id,
      case when public.is_operator() then 'operator' else 'system' end,
      'status_change', old.status, new.status, null);
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.trg_deals_closed_paid_awards()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.trg_deals_set_exclusive_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if new.status = 'EXCLUSIVE_WINDOW_ACTIVE' and old.status is distinct from new.status then
    if new.exclusive_ends_at is null then
      new.exclusive_ends_at := now() + interval '72 hours';
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.trg_lock_terminal_deals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('CLOSED_PAID', 'LOST', 'WITHDRAWN') THEN
    RAISE EXCEPTION 'Cannot modify a deal in a terminal state (%)', OLD.status;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trg_offers_mark_viewed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.trg_profiles_create_role_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'referrer' THEN
    INSERT INTO public.referrers (profile_id, points_closed_paid, tier, commission_rate)
    VALUES (NEW.id, 0, 'starter', 20)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF NEW.role = 'buyer' THEN
    INSERT INTO public.buyers (profile_id, buyer_type, track, reputation_score)
    VALUES (NEW.id, 'individual', 'B', 50)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.upsert_source_record_by_urlhash(p_source_id uuid, p_source_run_id uuid, p_source_url text, p_source_url_normalized text, p_source_url_hash text, p_raw_payload jsonb, p_payload_hash text, p_seen_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_external_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id  uuid;
  v_now timestamptz := COALESCE(p_seen_at, NOW());
BEGIN

  IF p_external_id IS NOT NULL THEN
    -- Branch A: stable external_id supplied by source
    -- Uses constraint uq_source_records_source_external: UNIQUE (source_id, external_id)
    INSERT INTO public.source_records (
      source_id, source_run_id, external_id,
      source_url, source_url_normalized, source_url_hash,
      raw_payload, payload_hash,
      first_seen_at, last_seen_at, is_deleted, deleted_at
    ) VALUES (
      p_source_id, p_source_run_id, p_external_id,
      p_source_url, p_source_url_normalized, p_source_url_hash,
      p_raw_payload, p_payload_hash,
      v_now, v_now, false, NULL
    )
    ON CONFLICT (source_id, external_id)
    DO UPDATE SET
      source_run_id         = EXCLUDED.source_run_id,
      source_url            = EXCLUDED.source_url,
      source_url_normalized = EXCLUDED.source_url_normalized,
      source_url_hash       = EXCLUDED.source_url_hash,
      raw_payload           = EXCLUDED.raw_payload,
      payload_hash          = EXCLUDED.payload_hash,
      last_seen_at          = EXCLUDED.last_seen_at,
      is_deleted            = false,
      deleted_at            = NULL
    RETURNING id INTO v_id;

  ELSE
    -- Branch B: no external_id â use URL hash identity
    -- Uses partial index uq_source_records_urlhash_no_extid:
    --   UNIQUE (source_id, source_url_hash) WHERE external_id IS NULL
    INSERT INTO public.source_records (
      source_id, source_run_id, external_id,
      source_url, source_url_normalized, source_url_hash,
      raw_payload, payload_hash,
      first_seen_at, last_seen_at, is_deleted, deleted_at
    ) VALUES (
      p_source_id, p_source_run_id, NULL,
      p_source_url, p_source_url_normalized, p_source_url_hash,
      p_raw_payload, p_payload_hash,
      v_now, v_now, false, NULL
    )
    ON CONFLICT (source_id, source_url_hash)
    WHERE (external_id IS NULL)
    DO UPDATE SET
      source_run_id         = EXCLUDED.source_run_id,
      source_url            = EXCLUDED.source_url,
      source_url_normalized = EXCLUDED.source_url_normalized,
      raw_payload           = EXCLUDED.raw_payload,
      payload_hash          = EXCLUDED.payload_hash,
      last_seen_at          = EXCLUDED.last_seen_at,
      is_deleted            = false,
      deleted_at            = NULL
    RETURNING id INTO v_id;

  END IF;

  RETURN v_id;
END;
$function$
;
CREATE VIEW public.latest_lot_snapshots AS  SELECT DISTINCT ON (canonical_lot_id) canonical_lot_id,
    id AS snapshot_id,
    observed_at,
    status,
    current_price,
    bid_count,
    closes_at,
    is_terminal,
    source_run_id,
    source_record_id
   FROM lot_snapshots s
  ORDER BY canonical_lot_id, observed_at DESC;
CREATE VIEW public.source_health AS  SELECT id,
    parser_key,
    is_active,
    ( SELECT max(r.started_at) AS max
           FROM source_runs r
          WHERE (r.source_id = s.id)) AS last_run,
    ( SELECT r.status
           FROM source_runs r
          WHERE (r.source_id = s.id)
          ORDER BY r.started_at DESC
         LIMIT 1) AS last_status
   FROM sources s;
CREATE VIEW public.v_deal_payout_summary AS  SELECT d.id AS deal_id,
    d.status,
    d.referrer_profile_id,
    p_ref.full_name AS referrer_name,
    d.buyer_profile_id,
    p_buy.full_name AS buyer_name,
    d.referrer_fee_split_percent,
    d.operator_fee_split_percent,
    pay.amount AS payout_amount,
    pay.status AS payout_status,
    d.created_at
   FROM (((deals d
     JOIN profiles p_ref ON ((d.referrer_profile_id = p_ref.id)))
     JOIN profiles p_buy ON ((d.buyer_profile_id = p_buy.id)))
     LEFT JOIN payouts pay ON ((d.id = pay.deal_id)));
CREATE VIEW public.v_source_recovery_status AS  SELECT s.parser_key,
    s.name AS source_name,
    s.quality_state,
    s.source_role,
    s.phase_current,
    s.production_ready,
    s.real_host_url,
    vf.family_name AS vendor_family,
    vf.phase_c_selected AS is_phase_c_target,
    s.disabled_reason,
    ( SELECT count(*) AS count
           FROM source_qualification_log q
          WHERE ((q.source_id = s.id) AND (q.gate_passed = true))) AS qualification_passes,
    ( SELECT max(r.run_at) AS max
           FROM source_recon_log r
          WHERE (r.source_id = s.id)) AS last_recon_at
   FROM (sources s
     LEFT JOIN vendor_families vf ON ((vf.id = s.vendor_family_id)))
  ORDER BY
        CASE s.phase_current
            WHEN 'E_promote'::text THEN 1
            WHEN 'D_qualify'::text THEN 2
            WHEN 'C_select'::text THEN 3
            WHEN 'B_consolidate'::text THEN 4
            WHEN 'A_recon'::text THEN 5
            WHEN 'live'::text THEN 0
            ELSE 6
        END, s.parser_key;
CREATE TRIGGER deals_audit_status AFTER UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION trg_deals_audit_status();
CREATE TRIGGER deals_closed_paid_awards AFTER UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION trg_deals_closed_paid_awards();
CREATE TRIGGER deals_set_exclusive_window BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION trg_deals_set_exclusive_window();
CREATE TRIGGER lock_terminal_deals BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION trg_lock_terminal_deals();
CREATE TRIGGER offers_mark_viewed AFTER UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION trg_offers_mark_viewed();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER on_reputation_change AFTER UPDATE OF reputation_score ON public.buyers FOR EACH ROW EXECUTE FUNCTION handle_reputation_change();
CREATE TRIGGER on_terminal_status_transition BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION check_terminal_status_transition();
CREATE TRIGGER profiles_create_role_record AFTER INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW WHEN ((new.role = ANY (ARRAY['buyer'::text, 'referrer'::text]))) EXECUTE FUNCTION trg_profiles_create_role_record();
CREATE TRIGGER trg_beta_signups_normalize_email BEFORE INSERT OR UPDATE ON public.beta_signups FOR EACH ROW EXECUTE FUNCTION beta_signups_normalize_email();
CREATE TRIGGER trg_block_unqualified_canonical BEFORE INSERT ON public.canonical_lots FOR EACH ROW EXECUTE FUNCTION block_canonical_from_unqualified_source();
CREATE TRIGGER trg_enforce_snapshot_traceability BEFORE INSERT ON public.lot_snapshots FOR EACH ROW EXECUTE FUNCTION enforce_snapshot_traceability();
CREATE TRIGGER trg_guard_production_source BEFORE INSERT ON public.source_records FOR EACH ROW EXECUTE FUNCTION guard_production_source_writes();
CREATE TRIGGER trg_guard_terminal_fields BEFORE UPDATE ON public.canonical_lots FOR EACH ROW EXECUTE FUNCTION guard_terminal_fields();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_source_records_audit AFTER INSERT OR DELETE OR UPDATE ON public.source_records FOR EACH ROW EXECUTE FUNCTION source_records_audit_trig();
ALTER TABLE public.agent_health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_identity_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_lot_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrer_tier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_qualification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_recon_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_records_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_run_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_terminal_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surplus_intake_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_insert_health ON public.agent_health_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text)))));
CREATE POLICY operator_view_agent_health ON public.agent_health_log AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text)))));
CREATE POLICY alert_matches_profile ON public.alert_matches AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY alert_rules_own ON public.alert_rules AS PERMISSIVE FOR ALL TO authenticated USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY "Allow authenticated select" ON public.audit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((is_operator() OR (actor_profile_id = auth.uid())));
CREATE POLICY "Deny all deletes" ON public.audit_logs AS PERMISSIVE FOR DELETE TO anon,authenticated USING (false);
CREATE POLICY "Deny all updates" ON public.audit_logs AS PERMISSIVE FOR UPDATE TO anon,authenticated USING (false);
CREATE POLICY audit_logs_self_insert ON public.audit_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((actor_profile_id = auth.uid()) AND (action IS NOT NULL)));
CREATE POLICY operator_all_audit_logs ON public.audit_logs AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY beta_signups_no_select ON public.beta_signups AS PERMISSIVE FOR SELECT TO anon,authenticated USING (false);
CREATE POLICY beta_signups_public_insert ON public.beta_signups AS PERMISSIVE FOR INSERT TO anon,authenticated WITH CHECK (((hp_text IS NULL) AND (email IS NOT NULL) AND (length(email) <= 254) AND (POSITION(('@'::text) IN (email)) > 1)));
CREATE POLICY operator_all_leads ON public.buyer_leads AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text)))));
CREATE POLICY operator_all_buyer_rep_events ON public.buyer_reputation_events AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY buyer_select_self ON public.buyers AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY operator_all_buyers ON public.buyers AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY content_posts_read_published ON public.content_posts AS PERMISSIVE FOR SELECT TO authenticated USING ((status = 'published'::text));
CREATE POLICY deals_buyer_select_own ON public.deals AS PERMISSIVE FOR SELECT TO authenticated USING ((buyer_profile_id = auth.uid()));
CREATE POLICY deals_referrer_select_own ON public.deals AS PERMISSIVE FOR SELECT TO authenticated USING ((referrer_profile_id = auth.uid()));
CREATE POLICY operator_all_deals ON public.deals AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY email_sends_operator_all ON public.email_campaign_sends AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'operator'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'operator'::text)))));
CREATE POLICY email_campaigns_operator_all ON public.email_campaigns AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'operator'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'operator'::text)))));
CREATE POLICY messages_buyer_insert ON public.messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_role = 'buyer'::text) AND (sender_profile_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM deals d
  WHERE ((d.id = messages.deal_id) AND (d.buyer_profile_id = auth.uid()))))));
CREATE POLICY messages_buyer_select ON public.messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM deals d
  WHERE ((d.id = messages.deal_id) AND (d.buyer_profile_id = auth.uid())))));
CREATE POLICY operator_all_messages ON public.messages AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY offers_buyer_select ON public.offers AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM deals d
  WHERE ((d.id = offers.deal_id) AND (d.buyer_profile_id = auth.uid())))));
CREATE POLICY operator_all_offers ON public.offers AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY opp_auth_select ON public.opportunities AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY opportunities_authenticated_read ON public.opportunities AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY opportunity_events_authenticated_read ON public.opportunity_events AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY opp_feat_auth_select ON public.opportunity_features AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY opportunity_features_authenticated_read ON public.opportunity_features AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY opp_hist_auth_select ON public.opportunity_history AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY opportunity_history_authenticated_read ON public.opportunity_history AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY operator_all_payouts ON public.payouts AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY referrer_select_own_payouts ON public.payouts AS PERMISSIVE FOR SELECT TO authenticated USING ((referrer_profile_id = auth.uid()));
CREATE POLICY service_role_full_access ON public.procurement_signals AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Operators can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'operator'::text)))));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((id = auth.uid()));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
CREATE POLICY operator_all_profiles ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY profile_delete ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (((auth.jwt() ->> 'user_role'::text) = 'admin'::text));
CREATE POLICY self_insert_profile ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((id = auth.uid()) AND (role = 'buyer'::text)));
CREATE POLICY self_select_profile ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
CREATE POLICY self_update_profile ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
CREATE POLICY "Allow authenticated select" ON public.properties AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY operator_all_candidates ON public.property_candidates AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text)))));
CREATE POLICY operator_all_referral_links ON public.referral_links AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY referrer_select_own_links ON public.referral_links AS PERMISSIVE FOR SELECT TO authenticated USING ((referrer_profile_id = auth.uid()));
CREATE POLICY operator_all_referrer_tier_history ON public.referrer_tier_history AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY operator_all_referrers ON public.referrers AS PERMISSIVE FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY referrer_select_self ON public.referrers AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY saved_opportunities_delete ON public.saved_opportunities AS PERMISSIVE FOR DELETE TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY saved_opportunities_insert ON public.saved_opportunities AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY saved_opportunities_select ON public.saved_opportunities AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY source_runs_operator_select ON public.source_runs AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text)))));
CREATE POLICY sources_operator_all ON public.sources AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'operator'::text)))));
CREATE POLICY sources_select_authenticated ON public.sources AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY subs_self_select ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY operators_insert_intake ON public.surplus_intake_v1 AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY operators_read_intake ON public.surplus_intake_v1 AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY operators_update_intake ON public.surplus_intake_v1 AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY user_preferences_insert ON public.user_preferences AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY user_preferences_select ON public.user_preferences AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY user_preferences_update ON public.user_preferences AS PERMISSIVE FOR UPDATE TO authenticated USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY user_prefs_self_select ON public.user_preferences AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY user_prefs_self_update ON public.user_preferences AS PERMISSIVE FOR UPDATE TO authenticated USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY user_prefs_self_upsert ON public.user_preferences AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((profile_id = auth.uid()));
