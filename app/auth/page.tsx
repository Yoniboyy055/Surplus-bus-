import { Suspense } from "react";

import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Suspense fallback={<p className="text-sm text-slate-300">Loading...</p>}>
        <AuthClient />
      </Suspense>
    </main>
  );
}
