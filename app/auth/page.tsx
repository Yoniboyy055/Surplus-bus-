import { Suspense } from "react";

import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-300">Loading...</p>}>
      <AuthClient />
    </Suspense>
  );
}
