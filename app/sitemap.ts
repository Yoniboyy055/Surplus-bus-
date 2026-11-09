import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/email/unsubscribe";
import { PUBLIC_ROUTES } from "@/lib/seo/publicRoutes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_ROUTES.map((r) => ({
    url: `${base}${r.path === "/" ? "" : r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
