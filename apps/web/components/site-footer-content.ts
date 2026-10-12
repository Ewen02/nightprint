import { machines, upcoming } from "@nightprint/catalog";
import type { SiteFooterProps } from "@nightprint/ui";
import { site } from "./seo";

/** Every machine in catalogue order: live ones first, then those to come. */
const sheets = [
  ...machines.map((m) => ({ code: m.code, title: m.title, live: true })),
  ...upcoming.map((m) => ({ code: m.code, title: m.title, live: false })),
];

/** How every page ends: the name, the next machine, the sections, who made it. */
export const siteFooter: SiteFooterProps = {
  title: site.name,
  tagline: site.tagline,
  series: {
    sheets,
    next: sheets.find((sheet) => !sheet.live),
    follow: { label: "Follow on X", href: site.author.url },
  },
  // From any page, back to the sections of the home page.
  links: [
    { label: "The run", href: "/#run" },
    { label: "Machines", href: "/#machines" },
    { label: "Legend", href: "/#legend" },
    { label: "Build log", href: "/#build-log" },
  ],
  credit: { name: site.author.name, href: site.author.url, year: "2026" },
};
