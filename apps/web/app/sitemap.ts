import { machines } from "@nightprint/catalog";
import type { MetadataRoute } from "next";
import { machinePath, site } from "../components/seo";

// A static export prerenders route handlers only when told to.
export const dynamic = "force-static";

/**
 * Published machines only: the upcoming ones have no page. A machine's date is the
 * day of its revision; the home page has no such date, so it carries none.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/` },
    ...machines.map((machine) => ({
      url: `${site.url}${machinePath(machine)}`,
      lastModified: machine.revised,
    })),
  ];
}
