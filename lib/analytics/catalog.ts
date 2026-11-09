/**
 * Event catalogue — generated from docs/analytics/events.json (copy of launch/data/events.json) (21 events, v1.0-draft).
 * Only these names and property keys are accepted; anything else is dropped.
 */
export const EVENTS = {
  page_viewed: { source: "client", props: ["path", "utm_source", "utm_medium", "utm_campaign", "utm_content", "referrer_host"] },
  cta_clicked: { source: "client", props: ["cta_id", "path", "utm_source", "utm_medium", "utm_campaign", "utm_content"] },
  waitlist_joined: { source: "server", props: ["consent_version", "has_utm"] },
  signup_completed: { source: "server", props: ["method", "from_waitlist"] },
  onboarding_completed: { source: "server", props: ["steps_completed", "provinces_count", "categories_count", "has_value_range"] },
  feed_viewed: { source: "server_or_client", props: ["result_count", "filter_province_count", "filter_category_count"] },
  opportunity_viewed: { source: "server", props: ["opportunity_id", "source_key", "source_status", "rank_position"] },
  score_reasons_expanded: { source: "client", props: ["opportunity_id"] },
  official_listing_clicked: { source: "server", props: ["opportunity_id", "source_key", "source_status", "surface"] },
  opportunity_saved: { source: "server", props: ["opportunity_id", "source_key"] },
  opportunity_unsaved: { source: "server", props: ["opportunity_id"] },
  alert_rule_created: { source: "server", props: ["rule_id", "has_category", "has_region", "has_price_range"] },
  alert_rule_updated: { source: "server", props: ["rule_id"] },
  alert_rule_deleted: { source: "server", props: ["rule_id"] },
  inbox_opened: { source: "server_or_client", props: ["unread_count"] },
  inbox_item_opened: { source: "server", props: ["delivery_id", "opportunity_id", "rule_id"] },
  source_status_viewed: { source: "server_or_client", props: ["live_count", "partial_count", "link_out_count"] },
  pricing_viewed: { source: "client", props: ["path"] },
  checkout_started: { source: "server", props: ["plan_key"] },
  subscription_started: { source: "server", props: ["plan_key", "billing_interval"] },
  marketing_email_pref_changed: { source: "server", props: ["enabled"] },
} as const;
