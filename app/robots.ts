import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/email/unsubscribe";
import { DISALLOWED_PREFIXES } from "@/lib/seo/publicRoutes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...DISALLOWED_PREFIXES] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
