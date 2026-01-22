"use client";

import { useState } from "react";

import { Button } from "@/components";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Best effort: clear server-side cookies too.
      await fetch("/auth/logout", { method: "POST" }).catch(() => undefined);

      const supabase = createClient();
      await supabase?.auth.signOut();
    } finally {
      window.location.href = "/auth";
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} loading={loading} aria-label="Logout">
      Logout
    </Button>
  );
}

