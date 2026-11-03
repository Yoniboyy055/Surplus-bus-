import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  size?: "nav" | "side" | "lockup";
  showWordmark?: boolean;
  className?: string;
};

const SIZES = {
  nav: { src: "/brand/nav_2x.png", width: 28, height: 28 },
  side: { src: "/brand/nav_80.png", width: 36, height: 36 },
  lockup: { src: "/brand/lockup_nav_light_transparent.png", width: 160, height: 40 },
};

/** Yonatan's 3D clay price-tag mark — never flatten or redraw. */
export function BrandMark({
  href = "/",
  size = "nav",
  showWordmark = true,
  className = "",
}: BrandMarkProps) {
  const asset = SIZES[size];
  const content =
    size === "lockup" ? (
      <Image
        src={asset.src}
        alt="Surplus Bus"
        width={asset.width}
        height={asset.height}
        className="h-10 w-auto"
        priority
      />
    ) : (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <Image
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          className="shrink-0"
          priority
        />
        {showWordmark && (
          <span
            className="sb-title text-[18px] text-[var(--sb-ink)]"
            style={{
              fontVariationSettings: '"opsz" 28, "wdth" 105, "wght" 700',
            }}
          >
            Surplus Bus
          </span>
        )}
      </span>
    );

  return (
    <Link href={href} className="inline-flex items-center no-underline hover:opacity-90">
      {content}
    </Link>
  );
}
