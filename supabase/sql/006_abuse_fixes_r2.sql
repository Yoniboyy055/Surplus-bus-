-- Round 2 Fixes

-- Fix 1: Payout Double-Dip
-- Add a unique constraint on deal_id to ensure only one payout record per deal.
alter table public.payouts
add constraint payouts_deal_id_key unique (deal_id);

-- Fix 3: Deal Status Rollback (Operator)
-- This is a complex state machine fix. The minimal fix is to prevent an operator from moving a deal *out* of a terminal state.
create or replace function public.check_terminal_status_transition()
returns trigger as $$
begin
  if old.status in ('CLOSED_PAID', 'LOST', 'WITHDRAWN') and new.status <> old.status then
    raise exception 'Cannot change status from a terminal state (%)', old.status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_terminal_status_transition
  before update on public.deals
  for each row execute function public.check_terminal_status_transition();

-- Fix 5: Audit Log Tampering
-- This requires RLS policy on the 'audit_logs' table for 'delete' and 'update' operations.
-- Since I cannot directly modify RLS policies, I will state the required RLS change:
-- CREATE POLICY "Audit logs are immutable" ON public.audit_logs
-- FOR DELETE TO authenticated
-- USING (false);
-- CREATE POLICY "Audit logs are immutable" ON public.audit_logs
-- FOR UPDATE TO authenticated
-- USING (false);
