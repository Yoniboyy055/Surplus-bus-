-- Migration 016: Add indexes on foreign key columns for better join performance

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_profile_id ON public.audit_logs(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_deal_id ON public.audit_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_buyer_reputation_events_buyer_profile_id ON public.buyer_reputation_events(buyer_profile_id);
CREATE INDEX IF NOT EXISTS idx_deals_mandate_confirmed_by ON public.deals(mandate_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_deals_referral_link_id ON public.deals(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_messages_deal_id ON public.messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_profile_id ON public.messages(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_offers_deal_id ON public.offers(deal_id);
CREATE INDEX IF NOT EXISTS idx_payouts_referrer_profile_id ON public.payouts(referrer_profile_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer_profile_id ON public.referral_links(referrer_profile_id);
CREATE INDEX IF NOT EXISTS idx_referrer_tier_history_referrer_profile_id ON public.referrer_tier_history(referrer_profile_id);
