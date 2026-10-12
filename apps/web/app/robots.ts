import type { MetadataRoute } from "next";
import { site } from "../components/seo";

export const dynamic = "force-static";

/**
 * Every crawler is welcome, search, user fetches and training alike: the site is
 * here to be read and cited (decided 12 Oct 2026, nightprint-seo rule 7).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
