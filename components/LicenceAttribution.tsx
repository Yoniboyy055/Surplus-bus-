import type { LicenceRef } from "@/lib/opendata/attribution";

export function LicenceAttribution({
  licence,
  className = "",
}: {
  licence: LicenceRef;
  className?: string;
}) {
  return (
    <p className={`text-xs text-[var(--sb-text-muted)] leading-relaxed ${className}`}>
      {licence.statement}{" "}
      <a
        href={licence.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--sb-accent)] hover:underline"
      >
        {licence.shortName}
      </a>
      . Not an official Government of Canada or provincial product. No endorsement implied.
    </p>
  );
}
