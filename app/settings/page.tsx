
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

const DIGEST_OPTIONS = ["realtime", "daily", "weekly"] as const;

type DigestFrequency = (typeof DIGEST_OPTIONS)[number];

type Preferences = {
  digest_frequency: DigestFrequency;
  provinces: string[];
  categories: string[];
  email_alerts: boolean;
  inbox_alerts: boolean;
  marketing_opt_in: boolean;
};

export default function SettingsPage() {
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>({
    digest_frequency: "daily",
    provinces: [],
    categories: [],
    email_alerts: true,
    inbox_alerts: true,
    marketing_opt_in: false,
  });

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: row } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (row) {
        setPreferences({
          digest_frequency: (row.digest_frequency as DigestFrequency) || "daily",
          provinces: Array.isArray(row.provinces) ? row.provinces : [],
          categories: Array.isArray(row.categories) ? row.categories : [],
          email_alerts: row.email_alerts ?? true,
          inbox_alerts: row.inbox_alerts ?? true,
          marketing_opt_in: row.marketing_opt_in ?? false,
        });
      }
      setLoading(false);
    };
    void load();
  }, []);

  const handleChange = <K extends keyof Preferences>(
    field: K,
    value: Preferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckbox = (
    field: "provinces" | "categories",
    option: string
  ) => {
    setPreferences((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(option)
          ? arr.filter((v) => v !== option)
          : [...arr, option],
      };
    });
  };

  const handleToggle = (field: "email_alerts" | "inbox_alerts" | "marketing_opt_in") => {
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = supabaseRef.current;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_preferences").upsert({
          user_id: user.id,
          digest_frequency: preferences.digest_frequency,
          provinces: preferences.provinces,
          categories: preferences.categories,
          email_alerts: preferences.email_alerts,
          inbox_alerts: preferences.inbox_alerts,
          marketing_opt_in: preferences.marketing_opt_in,
        }, { onConflict: "user_id" });
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-quantum-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Settings</h1>
      <p className="text-quantum-400">Manage your account and preferences.</p>

      <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-quantum-50 mb-2">Alert Preferences</h2>

        <div className="mb-4">
          <label className="block text-quantum-400 mb-1">
            Default digest frequency
          </label>
          <select
            className="bg-quantum-800 border border-quantum-700 rounded px-3 py-2 text-quantum-50"
            value={preferences.digest_frequency}
            onChange={(e) =>
              handleChange("digest_frequency", e.target.value as DigestFrequency)
            }
            title="Default digest frequency"
          >
            {DIGEST_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-quantum-400 mb-1">
            Watched provinces
          </label>
          <div className="flex flex-wrap gap-2">
            {PROVINCES.map((prov) => (
              <label key={prov} className="flex items-center gap-2">
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

        <div className="mb-4">
          <label className="block text-quantum-400 mb-1">
            Watched categories
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2">
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
      </div>

      <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-quantum-50 mb-2">Notifications</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.email_alerts}
              onChange={() => handleToggle("email_alerts")}
            />
            <span>Email alerts</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.inbox_alerts}
              onChange={() => handleToggle("inbox_alerts")}
            />
            <span>In-app inbox</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.marketing_opt_in}
              onChange={() => handleToggle("marketing_opt_in")}
            />
            <span>Marketing emails</span>
          </label>
        </div>
      </div>

      <button
        className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold mt-4"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>

      {/* Profile & preferences link removed, form is now unified here. */}
    </div>
  );
}
