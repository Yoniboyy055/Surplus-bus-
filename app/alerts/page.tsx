"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type AlertRule = {
  id: string;
  category: string;
  region: string | null;
  min_price: number | null;
  max_price: number | null;
  channel: string;
  is_active: boolean;
  created_at: string;
};

type FormState = {
  category: string;
  region: string;
  min_price: string;
  max_price: string;
  channel: string;
};

const CATEGORY_OPTIONS = [
  "Construction / RFP",
  "Auction / Surplus",
  "Equipment",
  "IT Equipment",
  "General",
];

const REGION_OPTIONS = [
  "Ontario",
  "British Columbia",
  "Alberta",
  "Quebec",
  "Manitoba",
  "Saskatchewan",
  "National",
];

const CHANNEL_OPTIONS = [
  { value: "in_app", label: "In-app inbox" },
  { value: "email", label: "Email digest" },
  { value: "sms", label: "SMS" },
];

const EMPTY_FORM: FormState = {
  category: "",
  region: "",
  min_price: "",
  max_price: "",
  channel: "in_app",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchAlerts = async () => {
    const res = await fetch("/api/alerts");
    if (!res.ok) return;
    const json = await res.json();
    setAlerts(json.alerts ?? []);
  };

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth?callbackUrl=/alerts");
        return;
      }
      await fetchAlerts();
      setLoading(false);
    };
    init();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.category) {
      setError("Category is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          region: form.region || null,
          min_price: form.min_price ? Number(form.min_price) : null,
          max_price: form.max_price ? Number(form.max_price) : null,
          channel: form.channel,
        }),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        setShowForm(false);
        await fetchAlerts();
      } else {
        const json = await res.json();
        setError(json.error ?? "Failed to create alert.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alert rule?")) return;
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) await fetchAlerts();
  };

  const handleToggle = async (alert: AlertRule) => {
    const res = await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !alert.is_active }),
    });
    if (res.ok) await fetchAlerts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-quantum-500 text-sm">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-quantum-50">Alert Rules</h1>
          <p className="text-quantum-400 mt-1 text-sm">
            Manage your opportunity alert criteria.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setError(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus size={15} />
          New Alert
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-quantum-900 border border-cyan-500/20 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-quantum-200">
              Create alert rule
            </h2>
            <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              New
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-quantum-500 mb-1.5">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50 text-sm focus:border-cyan-500 outline-none"
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-quantum-500 mb-1.5">
                Region / Province
              </label>
              <select
                value={form.region}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region: e.target.value }))
                }
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50 text-sm focus:border-cyan-500 outline-none"
              >
                <option value="">National (all)</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-quantum-500 mb-1.5">
                Delivery Channel
              </label>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channel: e.target.value }))
                }
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50 text-sm focus:border-cyan-500 outline-none"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Min Price */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-quantum-500 mb-1.5">
                Min Value ($)
              </label>
              <input
                type="number"
                min={0}
                value={form.min_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_price: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50 text-sm focus:border-cyan-500 outline-none"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-quantum-500 mb-1.5">
                Max Value ($)
              </label>
              <input
                type="number"
                min={0}
                value={form.max_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_price: e.target.value }))
                }
                placeholder="No limit"
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50 text-sm focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Alert Rule"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
                setForm(EMPTY_FORM);
              }}
              className="px-4 py-2 bg-quantum-800 text-quantum-400 hover:text-quantum-50 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Alert Rules List */}
      {alerts.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-quantum-800 flex items-center justify-center">
            <Bell size={22} className="text-quantum-500" />
          </div>
          <div>
            <p className="text-quantum-200 font-medium">No alert rules yet</p>
            <p className="text-quantum-500 text-sm mt-1">
              Create your first alert to start receiving opportunities.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition"
          >
            Create Alert
          </button>
        </div>
      ) : (
        alerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-quantum-600">
              Active Alert Rules ({alerts.filter((a) => a.is_active).length} of{" "}
              {alerts.length})
            </p>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-4 bg-quantum-900 border border-quantum-700 rounded-xl px-4 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Bell size={14} className="text-cyan-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-quantum-100">
                    {alert.category}
                    {alert.region ? ` — ${alert.region}` : " — National"}
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-quantum-500 bg-quantum-800 px-2 py-0.5 rounded">
                      {alert.category}
                    </span>
                    {alert.region && (
                      <span className="text-[10px] text-quantum-500 bg-quantum-800 px-2 py-0.5 rounded">
                        {alert.region}
                      </span>
                    )}
                    {(alert.min_price != null || alert.max_price != null) && (
                      <span className="text-[10px] text-quantum-500 bg-quantum-800 px-2 py-0.5 rounded">
                        $
                        {alert.min_price != null
                          ? alert.min_price.toLocaleString()
                          : "0"}{" "}
                        &ndash;{" "}
                        {alert.max_price != null
                          ? `$${alert.max_price.toLocaleString()}`
                          : "No limit"}
                      </span>
                    )}
                    <span className="text-[10px] text-quantum-500 bg-quantum-800 px-2 py-0.5 rounded capitalize">
                      {alert.channel.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                      alert.is_active
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "text-quantum-500 bg-quantum-800"
                    }`}
                  >
                    {alert.is_active ? "Active" : "Paused"}
                  </span>
                  <button
                    onClick={() => handleToggle(alert)}
                    className="text-quantum-500 hover:text-quantum-200 transition"
                    title={alert.is_active ? "Pause alert" : "Activate alert"}
                  >
                    {alert.is_active ? (
                      <ToggleRight size={18} className="text-cyan-400" />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="text-quantum-600 hover:text-red-400 transition"
                    title="Delete alert"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}