import { ExternalLink } from "lucide-react";
import { Button } from "./Button";

export function OfficialListingButton({
  href,
  size = "md",
  showHelper = false,
  variant = "outline",
}: {
  href: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showHelper?: boolean;
  variant?: "primary" | "outline" | "secondary";
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
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex no-underline">
        <Button size={size} variant={variant} className="inline-flex items-center gap-2" icon={<ExternalLink size={14} />}>
          View official listing
        </Button>
      </a>
      {showHelper && (
        <span className="text-xs text-[var(--sb-muted)]">Opens the source site. Not ours.</span>
      )}
    </div>
  );
}
