import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      redirect("/dashboard");
    }
  }
  return <>{children}</>;
}
