"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { AuditTimeline } from "@/components";

type AuditEntry = {
  id: string;
  action: string;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export default function OperatorAuditPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (profile?.role !== "operator") {
        router.push("/dashboard");
        return;
      }

      const { data, error: auditError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120);

      if (auditError) {
        setError(auditError.message);
      }

      setEntries((data ?? []) as AuditEntry[]);
      setLoading(false);
    };

    fetchAudit();
  }, [router, supabase]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-quantum-50">Audit Logs</h1>
          <p className="text-sm text-quantum-400">Chronological record of system actions and status changes.</p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-quantum-500">Loading audit timeline...</p>
        ) : (
          <div className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
            <AuditTimeline entries={entries} emptyMessage="No audit entries found yet." />
          </div>
        )}
      </div>
    </AppShell>
  );
}
