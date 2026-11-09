-- Migration 015: Optimize RLS policies to prevent auth.uid() re-evaluation
-- This improves performance by 10-100x for queries on large tables

-- Profiles table
DROP POLICY IF EXISTS self_select_profile ON public.profiles;
CREATE POLICY self_select_profile ON public.profiles 
FOR SELECT TO authenticated
USING (id = (select auth.uid()));

DROP POLICY IF EXISTS self_update_profile ON public.profiles;
CREATE POLICY self_update_profile ON public.profiles 
FOR UPDATE TO authenticated
USING (id = (select auth.uid()))
WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS self_insert_profile ON public.profiles;
CREATE POLICY self_insert_profile ON public.profiles 
FOR INSERT TO authenticated
WITH CHECK ((id = (select auth.uid())) AND (role = 'buyer'));

-- Referrers table
DROP POLICY IF EXISTS referrer_select_self ON public.referrers;
CREATE POLICY referrer_select_self ON public.referrers
FOR SELECT TO authenticated
USING (profile_id = (select auth.uid()));

-- Referral links table
DROP POLICY IF EXISTS referrer_select_own_links ON public.referral_links;
CREATE POLICY referrer_select_own_links ON public.referral_links
FOR SELECT TO authenticated
USING (referrer_profile_id = (select auth.uid()));

-- Buyers table
DROP POLICY IF EXISTS buyer_select_self ON public.buyers;
CREATE POLICY buyer_select_self ON public.buyers
FOR SELECT TO authenticated
USING (profile_id = (select auth.uid()));

-- Deals table
DROP POLICY IF EXISTS deals_buyer_select_own ON public.deals;
CREATE POLICY deals_buyer_select_own ON public.deals
FOR SELECT TO authenticated
USING (buyer_profile_id = (select auth.uid()));

DROP POLICY IF EXISTS deals_referrer_select_own ON public.deals;
CREATE POLICY deals_referrer_select_own ON public.deals
FOR SELECT TO authenticated
USING (referrer_profile_id = (select auth.uid()));

-- Offers table
DROP POLICY IF EXISTS offers_buyer_select ON public.offers;
CREATE POLICY offers_buyer_select ON public.offers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = offers.deal_id 
    AND d.buyer_profile_id = (select auth.uid())
  )
);

-- Messages table
DROP POLICY IF EXISTS messages_buyer_select ON public.messages;
CREATE POLICY messages_buyer_select ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = messages.deal_id 
    AND d.buyer_profile_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS messages_buyer_insert ON public.messages;
CREATE POLICY messages_buyer_insert ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = messages.deal_id 
    AND d.buyer_profile_id = (select auth.uid())
  )
  AND sender_profile_id = (select auth.uid())
);
