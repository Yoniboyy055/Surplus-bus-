"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Bell, Plus, Trash2 } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "", region: "", min_price: "", max_price: "", channel: "in_app" });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchAlerts = async () => {
    const res = await fetch("/api/alerts");
    if (!res.ok) return;
    const json = await res.json();
    setAlerts(json.alerts || []);
  };

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      await fetchAlerts();
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category || "General",
          region: form.region || null,
          min_price: form.min_price ? Number(form.min_price) : null,
          max_price: form.max_price ? Number(form.max_price) : null,
          channel: form.channel,
        }),
      });
      if (res.ok) {
        setForm({ category: "", region: "", min_price: "", max_price: "", channel: "in_app" });
        setShowForm(false);
        await fetchAlerts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create alert");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alert?")) return;
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) await fetchAlerts();
  };

  const handleToggleActive = async (alert: any) => {
    const res = await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !alert.is_active }),
    });
    if (res.ok) await fetchAlerts();
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading alerts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-quantum-50">Alerts</h1>
          <p className="text-quantum-400 mt-1">Create and manage your alert rules.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition"
        >
          <Plus size={16} /> Create alert
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-quantum-900 border border-quantum-700 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-quantum-200">New alert</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-quantum-500 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Vehicles, Land"
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
              />
            </div>
            <div>
              <label className="block text-xs text-quantum-500 mb-1">Region</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="e.g. Alberta"
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
              />
            </div>
            <div>
              <label className="block text-xs text-quantum-500 mb-1">Min price</label>
              <input
                type="number"
                value={form.min_price}
                onChange={(e) => setForm((f) => ({ ...f, min_price: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
              />
            </div>
            <div>
              <label className="block text-xs text-quantum-500 mb-1">Max price</label>
              <input
                type="number"
                value={form.max_price}
                onChange={(e) => setForm((f) => ({ ...f, max_price: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
              />
            </div>
            <div>
              <label className="block text-xs text-quantum-500 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded-lg text-quantum-50"
              >
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-quantum-800 text-quantum-400 rounded-lg font-medium hover:text-quantum-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {alerts.length === 0 && !showForm ? (
        <EmptyState
          icon={Bell}
          title="Create your first alert"
          description="Alerts notify you when new opportunities match your criteria."
          actionLabel="Create alert"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <ul className="space-y-4">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-quantum-50">{alert.category}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      alert.is_active ? "bg-accent-success/20 text-accent-success" : "bg-quantum-700 text-quantum-500"
                    }`}
                  >
                    {alert.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-sm text-quantum-500 mt-1">
                  {alert.region && `${alert.region} · `}
                  {alert.min_price != null && `$${alert.min_price} - `}
                  {alert.max_price != null && `$${alert.max_price}`}
                  {alert.channel && ` · ${alert.channel}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(alert)}
                  className="text-quantum-400 hover:text-quantum-50 text-sm"
                >
                  {alert.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
