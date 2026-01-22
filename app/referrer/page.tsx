"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { StatusPill } from "@/components";

const maskStatus = (status: string) => {
  const terminalStatuses = ["CLOSED_PAID", "LOST", "WITHDRAWN"];
  if (terminalStatuses.includes(status)) {
    return status.replace("_", " ");
  }
  return "Active Deal";
};

export default function ReferrerPortal() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [referrerData, setReferrerData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [referredDeals, setReferredDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(process.env.NEXT_PUBLIC_APP_URL || "");

  useEffect(() => {
    if (!baseUrl && typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, [baseUrl]);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (profile?.role !== "referrer") {
        router.push("/dashboard");
        return;
      }

      const { data: rData } = await supabase.from("referrers").select("*").eq("profile_id", auth.user.id).single();
      setReferrerData(rData);

      const { data: rLinks } = await supabase
        .from("referral_links")
        .select("code")
        .eq("referrer_profile_id", auth.user.id);
      setLinks(rLinks || []);

      const { data: rDeals } = await supabase
        .from("deals")
        .select("id, status, created_at")
        .eq("referrer_profile_id", auth.user.id)
        .order("created_at", { ascending: false });
      setReferredDeals(rDeals || []);

      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const generateLink = async () => {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/referral-links", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLinks((prev) => [...prev, { code: data.code }]);
      setNotice("New referral link generated.");
    } else {
      const err = await res.json();
      setError(err.error || "Unable to generate a referral link.");
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Referral link copied.");
    } catch {
      setError("Unable to copy the link. Please copy manually.");
    }
  };

  const buildLink = (code: string) => `${baseUrl || "https://surplus-bus.com"}/ref/${code}`;

  if (loading) {
    return (
      <AppShell>
        <div className="py-20 text-center text-quantum-500">Loading Referrer Portal...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-quantum-50">Referrer Portal</h1>
            <p className="text-sm text-quantum-400">Manage links and monitor referral performance.</p>
          </div>
          <div className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
            {referrerData?.tier || "Starter"} Tier
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        )}
        {notice && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            {notice}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
            <h3 className="text-sm font-medium text-quantum-400">Points Earned</h3>
            <p className="mt-2 text-2xl font-bold text-quantum-50">{referrerData?.points_closed_paid || 0}</p>
          </div>
          <div className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
            <h3 className="text-sm font-medium text-quantum-400">Commission Rate</h3>
            <p className="mt-2 text-2xl font-bold text-quantum-50">{referrerData?.commission_rate || 20}%</p>
          </div>
          <div className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
            <h3 className="text-sm font-medium text-quantum-400">Total Referrals</h3>
            <p className="mt-2 text-2xl font-bold text-quantum-50">{referredDeals.length}</p>
          </div>
        </div>

        <section id="links" className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-quantum-50">Referral Links</h2>
          <div className="space-y-3">
            {links.length === 0 ? (
              <p className="text-sm text-quantum-500">No referral links generated yet.</p>
            ) : (
              links.map((link) => {
                const url = buildLink(link.code);
                return (
                  <div key={link.code} className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="flex-1 rounded-lg border border-quantum-800 bg-quantum-950 px-4 py-2 text-sm text-quantum-300"
                    />
                    <button
                      onClick={() => handleCopy(url)}
                      className="rounded-full border border-quantum-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300 hover:border-cyan-500/50 hover:text-cyan-200"
                    >
                      Copy
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={generateLink}
            className="w-full rounded-full bg-quantum-800 py-2 text-sm font-semibold text-quantum-50 transition hover:bg-quantum-700"
          >
            Generate New Link
          </button>
        </section>

        <section id="referrals" className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-quantum-50">Referred Deals</h2>
          <div className="space-y-2">
            {referredDeals.length === 0 ? (
              <p className="text-sm text-quantum-500">No referrals yet.</p>
            ) : (
              referredDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between border-b border-quantum-800 pb-2 text-sm">
                  <span className="font-mono text-quantum-400">REF-{deal.id.substring(0, 6).toUpperCase()}</span>
                  <StatusPill status={maskStatus(deal.status)} size="sm" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
