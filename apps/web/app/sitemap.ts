import { machines, projects } from "@nightprint/catalog";
import type { MetadataRoute } from "next";
import { machinePath, site } from "../components/seo";

// A static export prerenders route handlers only when told to.
export const dynamic = "force-static";

/**
 * Published machines only, concepts and real projects read against their code: the
 * upcoming ones have no page, and a visitor's drawing on /import is not published. A
 * machine's date is the day of its revision; the home page has no such date, so it
 * carries none.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/` },
    ...[...machines, ...projects].map((machine) => ({
      url: `${site.url}${machinePath(machine)}`,
      lastModified: machine.revised,
    })),
  ];
}
