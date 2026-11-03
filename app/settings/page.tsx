"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const PROVINCES = [
  "Ontario",
  "British Columbia",
  "Alberta",
  "Quebec",
  "Manitoba",
  "Saskatchewan",
] as const;

const CATEGORIES = [
  "Construction / RFP",
  "Auction / Surplus",
  "Equipment",
  "IT Equipment",
] as const;

type Preferences = {
  digest_frequency: "in_app";
  provinces: string[];
  categories: string[];
  inbox_alerts: boolean;
  marketing_opt_in: boolean;
  urgency_days: number;
  min_value: string;
  max_value: string;
};

export default function SettingsPage() {
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<Preferences>({
    digest_frequency: "in_app",
    provinces: [],
    categories: [],
    inbox_alerts: true,
    marketing_opt_in: false,
    urgency_days: 14,
    min_value: "",
    max_value: "",
  });

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: row } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (row) {
        setPreferences({
          digest_frequency: "in_app",
          provinces: Array.isArray(row.provinces) ? row.provinces : [],
          categories: Array.isArray(row.categories) ? row.categories : [],
          inbox_alerts: row.inbox_alerts ?? true,
          marketing_opt_in: row.marketing_opt_in ?? false,
          urgency_days: row.urgency_days ?? 14,
          min_value: row.min_value != null ? String(row.min_value) : "",
          max_value: row.max_value != null ? String(row.max_value) : "",
        });
      }
      setLoading(false);
    };
    void load();
  }, []);

  const handleCheckbox = (field: "provinces" | "categories", option: string) => {
    setPreferences((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(option) ? arr.filter((v) => v !== option) : [...arr, option],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = supabaseRef.current;
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error: upsertError } = await supabase.from("user_preferences").upsert(
          {
            user_id: user.id,
            digest_frequency: "in_app",
            provinces: preferences.provinces,
            categories: preferences.categories,
            email_alerts: false,
            inbox_alerts: preferences.inbox_alerts,
            marketing_opt_in: preferences.marketing_opt_in,
          },
          { onConflict: "user_id" }
        );
        if (upsertError) setError("We couldn't save that. Try again.");
        else setSaved(true);
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-[var(--sb-text-muted)]">Loading your settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--sb-text)]">Settings</h1>
        <p className="text-[var(--sb-text-muted)]">
          Manage your account, what you watch, and how we reach you.
        </p>
      </div>

      <div className="bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[var(--sb-text)]">What you watch</h2>
        <p className="text-sm text-[var(--sb-text-muted)]">
          These shape how your feed and inbox are ranked.
        </p>

        <div>
          <label className="block text-[var(--sb-text-secondary)] mb-1 text-sm">Provinces</label>
          <div className="flex flex-wrap gap-3">
            {PROVINCES.map((prov) => (
              <label key={prov} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.provinces.includes(prov)}
                  onChange={() => handleCheckbox("provinces", prov)}
                />
                <span>{prov}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[var(--sb-text-secondary)] mb-1 text-sm">Categories</label>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.categories.includes(cat)}
                  onChange={() => handleCheckbox("categories", cat)}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[var(--sb-text-secondary)] mb-1 text-sm">
            Urgency window (days)
          </label>
          <input
            type="number"
            min={1}
            className="bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-[var(--sb-text)] w-32"
            value={preferences.urgency_days}
            onChange={(e) =>
              setPreferences((p) => ({ ...p, urgency_days: Number(e.target.value) || 14 }))
            }
          />
          <p className="text-xs text-[var(--sb-text-muted)] mt-1">
            Listings closing within this many days get flagged as time-sensitive. Closed listings are
            never shown.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--sb-text-secondary)] mb-1 text-sm">Min value</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Optional"
              className="w-full bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-[var(--sb-text)]"
              value={preferences.min_value}
              onChange={(e) => setPreferences((p) => ({ ...p, min_value: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[var(--sb-text-secondary)] mb-1 text-sm">Max value</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Optional"
              className="w-full bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-[var(--sb-text)]"
              value={preferences.max_value}
              onChange={(e) => setPreferences((p) => ({ ...p, max_value: e.target.value }))}
            />
          </div>
          <p className="col-span-2 text-xs text-[var(--sb-text-muted)]">Optional. Leave blank for no limit.</p>
        </div>
      </div>

      <div className="bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[var(--sb-text)]">Digest frequency</h2>
        <div className="rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] px-3 py-2 text-sm text-[var(--sb-text-secondary)]">
          In-app only for now
        </div>
        <p className="text-xs text-[var(--sb-text-muted)]">
          Matches appear in your in-app inbox. Email digests are coming later.
        </p>
      </div>

      <div className="bg-[var(--sb-surface)] border border-[var(--sb-border)] rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[var(--sb-text)]">Emails from us</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={preferences.marketing_opt_in}
            onChange={() =>
              setPreferences((p) => ({ ...p, marketing_opt_in: !p.marketing_opt_in }))
            }
          />
          <span>
            <span className="text-[var(--sb-text)]">Product updates about Surplus Bus</span>
            <span className="block text-xs text-[var(--sb-text-muted)] mt-1">
              Occasional news about features. Unsubscribe anytime here or from any email. Default is
              off.
            </span>
          </span>
        </label>
        <p className="text-xs text-[var(--sb-text-muted)]">
          We&apos;ll still email you about your account and billing when needed.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={preferences.inbox_alerts}
            onChange={() =>
              setPreferences((p) => ({ ...p, inbox_alerts: !p.inbox_alerts }))
            }
          />
          <span>Show new matches in my in-app inbox</span>
        </label>
      </div>

      <button
        className="bg-[var(--sb-accent)] text-[var(--sb-text-inverse)] px-4 py-2 rounded-lg font-semibold active:scale-[0.97] disabled:opacity-60"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
      {error && <p className="text-[var(--sb-danger)] text-sm">{error}</p>}
    </div>
  );
}
