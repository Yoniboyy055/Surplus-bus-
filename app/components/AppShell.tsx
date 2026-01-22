import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components";

import LogoutButton from "./LogoutButton";

type Role = "operator" | "buyer" | "referrer";

function getEnvLabel() {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return { label: "PRODUCTION", variant: "success" as const };
  if (vercelEnv === "preview") return { label: "STAGING", variant: "warning" as const };
  if (process.env.NODE_ENV === "production") return { label: "PRODUCTION", variant: "success" as const };
  return { label: "DEV", variant: "info" as const };
}

function roleVariant(role: Role) {
  switch (role) {
    case "operator":
      return "info" as const;
    case "referrer":
      return "warning" as const;
    case "buyer":
      return "default" as const;
  }
}

export default function AppShell({
  children,
  userEmail,
  role,
}: {
  children: ReactNode;
  userEmail: string | null;
  role: Role;
}) {
  const env = getEnvLabel();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">
              Surplus Bus
            </Link>
            <Badge variant={env.variant} size="sm">
              {env.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden sm:inline text-xs font-medium text-slate-300">
                {userEmail}
              </span>
            )}
            <Badge variant={roleVariant(role)} size="sm">
              {role.toUpperCase()}
            </Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

