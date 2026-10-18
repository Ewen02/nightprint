import type { Machine } from "@nightprint/engine";
import type { Metadata } from "next";
import { seriesHref, seriesOf } from "./series";

/** What every page's metadata and structured data share. */
export const site = {
  name: "Nightprint",
  url: "https://nightprint.dev",
  tagline: "Software architecture, drawn as machines you can run.",
  description:
    "Software architecture patterns as interactive 3D machines in your browser. Follow a request step by step, flip a what-if switch, and read a sourced explainer.",
  locale: "en_US",
  author: { name: "Ewen", url: "https://x.com/ewenlq", handle: "@ewenlq" },
  /**
   * Where the next machine is put to a vote: an X poll's own URL while one runs, so a click
   * lands on the vote; the profile between polls, to suggest one.
   */
  poll: "https://x.com/ewenlq",
  /** The machines a running poll offers; none between polls. */
  pollFor: [] as readonly string[],
  /** The public repository: its commits are the full build log. */
  repo: "https://github.com/Ewen02/nightprint",
} as const;

/** A real project drawn from its repository (PRJ), not a concept (MCH). */
export function isProject(machine: Pick<Machine, "code">): boolean {
  return machine.code.startsWith("PRJ-");
}

/**
 * The canonical path of a machine page, with the trailing slash the export serves:
 * concepts under /m/, real projects under /p/.
 */
export function machinePath(machine: Pick<Machine, "slug" | "code">): string {
  return `${isProject(machine) ? "/p" : "/m"}/${machine.slug}/`;
}

/**
 * "Hexagonal architecture (ports and adapters)": the concept under all its names. A real
 * project is searched for by its name: "Nightprint's architecture".
 */
export function machineHeadline(machine: Pick<Machine, "title" | "aliases" | "code">): string {
  if (isProject(machine)) {
    return `${machine.title}'s architecture`;
  }
  return machine.aliases.length > 0
    ? `${machine.title} (${machine.aliases.join(", ")})`
    : machine.title;
}

/** The search snippet: what the page is, then the concept, or the project, in one sentence. */
export function machineDescription(machine: Machine): string {
  const what = isProject(machine)
    ? "drawn from its repository as a 3D machine you can run"
    : "explained as a 3D machine you can run";
  return `${machineHeadline(machine)}, ${what}. ${machine.summary}`;
}

/**
 * The preview image of a page: the `og.png` route beside it. The query changes with
 * the date it depends on, so networks that cache previews fetch the new one.
 */
export function previewImage(path: string, version: string, alt: string) {
  return { url: `${path}og.png?v=${version}`, width: 1200, height: 630, type: "image/png", alt };
}

/**
 * Open Graph and X card fields for a page. A page that sets `openGraph` replaces the
 * layout's whole object, so every page builds its own from here.
 */
export function socialMetadata(page: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly image: ReturnType<typeof previewImage>;
  readonly article?: { readonly modifiedTime: string };
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title: page.title,
      description: page.description,
      url: page.path,
      siteName: site.name,
      locale: site.locale,
      images: [page.image],
      ...(page.article
        ? { type: "article", modifiedTime: page.article.modifiedTime, authors: [site.author.url] }
        : { type: "website" }),
    },
    twitter: {
      card: "summary_large_image",
      creator: site.author.handle,
      title: page.title,
      description: page.description,
      images: [{ url: page.image.url, alt: page.image.alt }],
    },
  };
}

const ids = {
  website: `${site.url}/#website`,
  author: `${site.url}/#author`,
};

const author = {
  "@type": "Person",
  "@id": ids.author,
  name: site.author.name,
  url: site.author.url,
  sameAs: [site.author.url],
};

/** The home page: the site and who draws it. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": ids.website,
        name: site.name,
        url: `${site.url}/`,
        description: site.description,
        inLanguage: "en",
        author: { "@id": ids.author },
      },
      author,
    ],
  };
}

/** A real project's repository, from the source it was drawn from: "https://github.com/o/n". */
function repositoryOf(machine: Machine): string | undefined {
  const url = machine.sources[0]?.url;
  const match = url ? /^(https:\/\/github\.com\/[^/]+\/[^/]+)/.exec(url) : null;
  return match?.[1];
}

/**
 * A machine page: the article, what it is about, what it was checked against, and
 * the breadcrumb the header shows. Only what the page shows, and its revision day
 * as the one date: the page states no other.
 */
export function machineJsonLd(machine: Machine) {
  const url = `${site.url}${machinePath(machine)}`;
  const image = previewImage(machinePath(machine), machine.revised, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: machine.title,
        ...(machine.aliases.length > 0 && { alternativeHeadline: machineHeadline(machine) }),
        description: machine.summary,
        // A concept is a Thing; a real project is the code it was drawn from.
        about: isProject(machine)
          ? {
              "@type": "SoftwareSourceCode",
              name: machine.title,
              ...(repositoryOf(machine) && { codeRepository: repositoryOf(machine) }),
            }
          : {
              "@type": "Thing",
              name: machine.title,
              ...(machine.aliases.length > 0 && { alternateName: machine.aliases }),
            },
        author: { "@id": ids.author },
        citation: machine.sources.map((source) => ({
          "@type": "CreativeWork",
          name: source.label,
          url: source.url,
        })),
        // The page's preview: the machine's plan view and its title block.
        image: {
          "@type": "ImageObject",
          url: `${site.url}${image.url}`,
          width: image.width,
          height: image.height,
        },
        dateModified: machine.revised,
        inLanguage: "en",
        isPartOf: { "@id": ids.website },
        mainEntityOfPage: url,
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: `${site.url}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: seriesOf(machine).label,
            item: `${site.url}${seriesHref(seriesOf(machine))}`,
          },
          { "@type": "ListItem", position: 3, name: machine.code, item: url },
        ],
      },
      { "@type": "WebSite", "@id": ids.website, name: site.name, url: `${site.url}/` },
      author,
    ],
  };
}
