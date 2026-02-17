-- -----------------------------------------------------------------------------
-- MIGRATION: 023_email_campaigns.sql
-- PURPOSE: Email campaigns, sends, user_preferences news_opt_in + unsub_token
-- -----------------------------------------------------------------------------

BEGIN;

-- 0) Preferences: add promo/news opts + unsubscribe token
ALTER TABLE IF EXISTS public.user_preferences
  ADD COLUMN IF NOT EXISTS news_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsub_token text;

-- Backfill unsub_token for existing rows
UPDATE public.user_preferences
SET unsub_token = coalesce(unsub_token, gen_random_uuid()::text)
WHERE unsub_token IS NULL;

-- Default for new inserts + not null
ALTER TABLE public.user_preferences
  ALTER COLUMN unsub_token SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN unsub_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'user_preferences_unsub_token_key'
  ) THEN
    CREATE UNIQUE INDEX user_preferences_unsub_token_key
      ON public.user_preferences (unsub_token);
  END IF;
END $$;

-- 1) Campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('discount', 'news', 'marketing')),
  subject text NOT NULL,
  preheader text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- 2) Sends (per recipient)
CREATE TABLE IF NOT EXISTS public.email_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  provider_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON public.email_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_profile ON public.email_campaign_sends(profile_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON public.email_campaign_sends(status);

-- 3) RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_campaigns_operator_all" ON public.email_campaigns;
CREATE POLICY "email_campaigns_operator_all"
ON public.email_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'operator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'operator'
  )
);

DROP POLICY IF EXISTS "email_sends_operator_all" ON public.email_campaign_sends;
CREATE POLICY "email_sends_operator_all"
ON public.email_campaign_sends
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'operator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'operator'
  )
);

COMMIT;
