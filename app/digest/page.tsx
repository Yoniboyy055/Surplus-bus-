import { redirect } from "next/navigation";

/** The old in-app digest preview is replaced by the real inbox. */
export default function DigestPage() {
  redirect("/inbox");
}
