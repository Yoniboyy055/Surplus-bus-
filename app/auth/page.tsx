import { Suspense } from "react";
import Link from "next/link";
import AuthClient from "./AuthClient";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default function AuthPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-5 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center">
        <div className="mb-6">
          <BrandMark size="side" />
        </div>
        <div className="card flex w-full flex-col items-center p-8">
          <h1 className="sb-title mb-2 text-[24px] text-[var(--sb-ink)]">Sign in to Surplus Bus</h1>
          <p className="mb-6 text-center text-sm text-[var(--sb-ink-soft)]">
            Beta access is by invitation. Sign in with your invited account.
          </p>
          <Suspense fallback={<p className="text-sm text-[var(--sb-ink-soft)]">Loading…</p>}>
            <AuthClient />
          </Suspense>
          <div className="banner mt-6 w-full !mb-0 text-center text-xs">
            Not invited yet? <Link href="/landing" className="underline">Join the waitlist</Link>.
          </div>
        </div>
        <div className="mt-6 w-full text-center text-xs text-[var(--sb-ink-soft)]">
          <Link href="/legal/terms" className="hover:text-[var(--sb-ink)]">Terms</Link> &middot;{" "}
          <Link href="/legal/privacy" className="hover:text-[var(--sb-ink)]">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
