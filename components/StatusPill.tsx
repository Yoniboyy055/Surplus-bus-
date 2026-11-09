import { Badge } from "./Badge";

interface StatusPillProps {
  status: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Opportunity / listing status only. Deal-pipeline statuses were removed. */
export const StatusPill = ({ status, size = "md", className = "" }: StatusPillProps) => {
  const getStatusConfig = (s: string) => {
    const key = (s || "").toLowerCase();
    switch (key) {
      case "open":
      case "active":
      case "new":
        return { label: key === "new" ? "New" : "Open", variant: "success" as const };
      case "updated":
        return { label: "Updated", variant: "info" as const };
      case "closing_soon":
      case "closing-soon":
        return { label: "Closing soon", variant: "warning" as const };
      case "closed":
      case "awarded":
      case "expired":
      case "sold":
      case "unsold":
      case "withdrawn":
        return { label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), variant: "default" as const };
      default:
        return { label: s.replace(/_/g, " "), variant: "default" as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} size={size} className={`whitespace-nowrap ${className}`}>
      {config.label}
    </Badge>
  );
};
