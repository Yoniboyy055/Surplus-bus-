"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

type Source = {
  id: string;
  name: string;
  kind: string;
  jurisdiction: string;
  base_url: string;
  feed_url: string | null;
  parser_key: string;
  is_active: boolean;
  fetch_interval_minutes: number;
  priority: number;
  robots_policy: string;
};

export default function OpsSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Source | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const fetchSources = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "operator") {
      router.push("/dashboard");
      return;
    }

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("priority", { ascending: true });

    if (error) {
      console.error("Error fetching sources:", error);
    } else {
      setSources(data || []);
    }
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleToggleActive = async (source: Source) => {
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase
      .from("sources")
      .update({ is_active: !source.is_active, updated_at: new Date().toISOString() })
      .eq("id", source.id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
    setSaving(false);
  };

  const handleSave = async (payload: Partial<Source>) => {
    if (!supabase) return;
    setSaving(true);
    const isEdit = !!editing;
    const { error } = isEdit
      ? await supabase.from("sources").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing!.id)
      : await supabase.from("sources").insert(payload);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setEditing(null);
      setCreating(false);
      fetchSources();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this source?")) return;
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("sources").delete().eq("id", id);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setSources((prev) => prev.filter((s) => s.id !== id));
      setEditing(null);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading sources...</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ops"
            className="text-quantum-400 hover:text-quantum-50 flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} /> Ops
          </Link>
          <h1 className="text-2xl font-bold text-quantum-50">Sources</h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreating(true)}
          disabled={creating || !!editing}
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Add source
        </Button>
      </header>

      <p className="text-quantum-500 text-sm">
        Schedule is managed in Vercel (daily). This field is informational.
      </p>

      {(creating || editing) && (
        <SourceForm
          source={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          saving={saving}
        />
      )}

      <div className="bg-quantum-900 border border-quantum-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-quantum-700 bg-quantum-800/50">
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Kind</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Jurisdiction</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">parser_key</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Schedule</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Priority</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Active</th>
              <th className="text-right px-4 py-3 text-quantum-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-quantum-800 last:border-0 hover:bg-quantum-800/30">
                <td className="px-4 py-3 text-quantum-100">{s.name}</td>
                <td className="px-4 py-3 text-quantum-400">{s.kind}</td>
                <td className="px-4 py-3 text-quantum-400">{s.jurisdiction}</td>
                <td className="px-4 py-3 font-mono text-cyan-400">{s.parser_key}</td>
                <td className="px-4 py-3 text-quantum-500 text-xs">Daily (Vercel)</td>
                <td className="px-4 py-3 text-quantum-400">{s.priority}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(s)}
                    disabled={saving}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      s.is_active ? "bg-accent-success/20 text-accent-success" : "bg-quantum-700 text-quantum-500"
                    }`}
                  >
                    {s.is_active ? "On" : "Off"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(s)}
                    disabled={creating}
                    className="text-quantum-400 hover:text-cyan-400 p-1"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={saving}
                    className="text-quantum-400 hover:text-red-400 p-1 ml-2"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sources.length === 0 && (
          <div className="px-4 py-12 text-center text-quantum-500 text-sm">
            No sources. Add one to enable ingestion.
          </div>
        )}
      </div>
    </div>
  );
}

function SourceForm({
  source,
  onSave,
  onCancel,
  saving,
}: {
  source?: Source;
  onSave: (p: Partial<Source>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(source?.name ?? "");
  const [kind, setKind] = useState(source?.kind ?? "surplus");
  const [jurisdiction, setJurisdiction] = useState(source?.jurisdiction ?? "CA-FED");
  const [baseUrl, setBaseUrl] = useState(source?.base_url ?? "");
  const [feedUrl, setFeedUrl] = useState(source?.feed_url ?? "");
  const [parserKey, setParserKey] = useState(source?.parser_key ?? "");
  const [priority, setPriority] = useState(source?.priority ?? 100);

  const submit = () => {
    if (!name.trim() || !baseUrl.trim() || !parserKey.trim()) {
      alert("Name, base_url, and parser_key are required.");
      return;
    }
    onSave({
      name: name.trim(),
      kind,
      jurisdiction: jurisdiction.trim() || "CA-FED",
      base_url: baseUrl.trim(),
      feed_url: feedUrl.trim() || null,
      parser_key: parserKey.trim(),
      fetch_interval_minutes: 1440,
      priority,
      is_active: source?.is_active ?? true,
    });
  };

  return (
    <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-quantum-200">
        {source ? "Edit source" : "Add source"}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs text-quantum-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
            placeholder="GC Buyandsell"
          />
        </div>
        <div>
          <label className="block text-xs text-quantum-500 mb-1">Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
          >
            <option value="rfp">rfp</option>
            <option value="surplus">surplus</option>
            <option value="auction">auction</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-quantum-500 mb-1">Jurisdiction</label>
          <input
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
            placeholder="CA-FED"
          />
        </div>
        <div>
          <label className="block text-xs text-quantum-500 mb-1">parser_key</label>
          <input
            type="text"
            value={parserKey}
            onChange={(e) => setParserKey(e.target.value)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm font-mono"
            placeholder="gc_buyandsell"
            disabled={!!source}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-quantum-500 mb-1">base_url</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
            placeholder="https://gcsurplus.ca"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-quantum-500 mb-1">feed_url (optional)</label>
          <input
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-xs text-quantum-500 mb-1">Priority</label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10) || 100)}
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving} size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
