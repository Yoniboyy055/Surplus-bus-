"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Bookmark } from "lucide-react";

export default function SavedPage() {
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchSaved = async () => {
    const res = await fetch("/api/saved");
    if (!res.ok) return;
    const json = await res.json();
    setSaved(json.saved || []);
  };

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      await fetchSaved();
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const handleRemove = async (opportunityId: string) => {
    await fetch(`/api/saved?opportunity_id=${opportunityId}`, { method: "DELETE" });
    await fetchSaved();
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading saved...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Saved</h1>
      <p className="text-quantum-400">Opportunities you saved to revisit later.</p>

      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Save opportunities to revisit later"
          description="When viewing an opportunity, click Save to add it here."
          actionLabel="Browse opportunities"
          onAction={() => router.push("/opportunities")}
        />
      ) : (
        <ul className="space-y-4">
          {saved.map((s: any) => {
            const opp = s.opportunities;
            if (!opp) return null;
            return (
              <li
                key={s.opportunity_id}
                className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 flex justify-between items-start"
              >
                <div>
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    {opp.title}
                  </Link>
                  <div className="flex gap-4 mt-2 text-sm text-quantum-500">
                    <span>{opp.province}</span>
                    <span>{opp.category || "—"}</span>
                    {opp.estimated_value != null && (
                      <span>${opp.estimated_value.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-quantum-600 mt-1">
                    Saved {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleRemove(s.opportunity_id)}
                    className="text-quantum-500 hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
