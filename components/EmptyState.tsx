import React from "react";
import Image from "next/image";
import { Button } from "./Button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  imageSrc?: string;
  imageAlt?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  imageSrc = "/images/empty_crate.jpg",
  imageAlt = "ILLUSTRATIVE empty crate",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center max-w-[520px] mx-auto py-10 px-4 ${className}`}>
      {imageSrc ? (
        <div className="relative w-[280px] h-[200px] mb-5 rounded-[20px] overflow-hidden shadow-raised">
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
          <span className="absolute top-2 right-2 rounded-full bg-[var(--sb-ink)] text-[var(--sb-bg)] text-[10px] font-bold tracking-wider px-2 py-1">
            ILLUSTRATIVE
          </span>
        </div>
      ) : Icon ? (
        <div className="w-16 h-16 bg-[var(--sb-surface)] border border-[var(--sb-line)] rounded-full flex items-center justify-center mb-6 shadow-soft">
          <Icon size={32} className="text-[var(--sb-muted)]" />
        </div>
      ) : null}
      <h3 className="sb-title text-[26px] text-[var(--sb-ink)] mb-2">{title}</h3>
      <p className="text-[var(--sb-muted)] max-w-sm mb-6 text-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
