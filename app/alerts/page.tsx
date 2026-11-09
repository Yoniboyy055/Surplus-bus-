import { redirect } from "next/navigation";

/** Alerts are configured per saved search. */
export default function AlertsPage() {
  redirect("/saved");
}
