"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";

export default function DigestPage() {
  const [on, setOn] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  function turnOff() {
    setOn(false);
    setToast("Digest turned off. You can turn it back on in Settings anytime.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="sb-title text-[26px] text-[var(--sb-ink)]">In-app digest</h1>
          <p className="text-sm text-[var(--sb-muted)]">
            New sold data only · no email alerts in this design
          </p>
        </div>
        {on ? (
          <Button variant="ghost" onClick={turnOff}>
            Turn off digest
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setOn(true);
              setToast("Digest turned on.");
            }}
          >
            Turn on digest
          </Button>
        )}
      </div>

      {on ? (
        <div className="card grid items-center gap-4 md:grid-cols-[140px_1fr]">
          <div className="relative h-[120px] w-full overflow-hidden rounded-2xl shadow-soft md:h-[140px]">
            <Image src="/images/digest_notice.jpg" alt="ILLUSTRATIVE sealed notice" fill className="object-cover" />
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent)]">
              New sold matches
            </div>
            <strong className="text-lg text-[var(--sb-ink)]">pickup truck — 6 new closed lots</strong>
            <p className="my-2 text-sm text-[var(--sb-muted)]">
              Since you last visited. Sample size and band may have shifted. ILLUSTRATIVE card.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/comps?q=pickup%20truck" className="btn btn-primary no-underline">
                Review comps
              </Link>
              <Button variant="ghost" onClick={turnOff}>
                Turn off digest
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="banner">Digest is Off. No in-app notices until you turn it back on.</div>
      )}

      <p className="text-sm text-[var(--sb-muted)]">
        One-click mute on every card and in Settings. No guilt copy.
      </p>
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
}
