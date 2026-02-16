"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ProfileSettingsPage() {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      setPrefs(
        data || {
          timezone: "UTC",
          digest_frequency: "daily",
          provinces: [],
          categories: [],
          min_value: null,
          max_value: null,
          urgency_days: 7,
        }
      );
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !prefs) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_preferences").upsert(
      {
        profile_id: user.id,
        timezone: prefs.timezone || "UTC",
        digest_frequency: prefs.digest_frequency || "daily",
        provinces: prefs.provinces || [],
        categories: prefs.categories || [],
        min_value: prefs.min_value ? Number(prefs.min_value) : null,
        max_value: prefs.max_value ? Number(prefs.max_value) : null,
        urgency_days: prefs.urgency_days ? Number(prefs.urgency_days) : 7,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (error) {
      alert(error.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/settings" className="text-quantum-500 hover:text-quantum-400 text-sm">
        ← Back to settings
      </Link>

      <h1 className="text-2xl font-bold text-quantum-50">Profile & preferences</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-quantum-200 mb-2">Digest frequency</label>
          <select
            value={prefs?.digest_frequency || "daily"}
            onChange={(e) => setPrefs((p: any) => ({ ...p, digest_frequency: e.target.value }))}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
          >
            <option value="realtime">Realtime</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-quantum-200 mb-2">Timezone</label>
          <input
            type="text"
            value={prefs?.timezone || "UTC"}
            onChange={(e) => setPrefs((p: any) => ({ ...p, timezone: e.target.value }))}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-quantum-200 mb-2">Urgency window (days)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={prefs?.urgency_days ?? 7}
            onChange={(e) => setPrefs((p: any) => ({ ...p, urgency_days: e.target.value }))}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
          />
          <p className="text-xs text-quantum-500 mt-1">
            Opportunities closing within this many days get higher urgency scores.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-quantum-200 mb-2">Min value (optional)</label>
          <input
            type="number"
            value={prefs?.min_value ?? ""}
            onChange={(e) => setPrefs((p: any) => ({ ...p, min_value: e.target.value || null }))}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-quantum-200 mb-2">Max value (optional)</label>
          <input
            type="number"
            value={prefs?.max_value ?? ""}
            onChange={(e) => setPrefs((p: any) => ({ ...p, max_value: e.target.value || null }))}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <Link
            href="/settings"
            className="px-4 py-2 bg-quantum-800 text-quantum-400 rounded-lg font-medium hover:text-quantum-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
