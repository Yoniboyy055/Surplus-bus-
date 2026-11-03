import { ExternalLink } from "lucide-react";
import { Button } from "./Button";

export function OfficialListingButton({
  href,
  size = "md",
  showHelper = false,
}: {
  href: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showHelper?: boolean;
}) {
  if (!href) {
    return (
      <Button size={size} variant="secondary" disabled>
        Source unavailable
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Button size={size} variant="primary" className="inline-flex items-center gap-2">
          View official listing
          <ExternalLink size={14} />
        </Button>
      </a>
      {showHelper && (
        <span className="text-xs text-[var(--sb-text-muted)]">Opens the source site. Not ours.</span>
      )}
    </div>
  );
}
