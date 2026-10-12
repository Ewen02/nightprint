---
name: nightprint-seo
description: How Nightprint does SEO, GEO and AEO. Read before touching metadata, the sitemap, robots, Open Graph images, JSON-LD, llms.txt or the wording of a machine page, and whenever another SEO skill's advice conflicts with this repo.
---

# SEO, GEO and AEO in Nightprint

Nightprint is a static Next.js 16 export (`output: "export"`, `trailingSlash: true`) served at
https://nightprint.dev. Each machine page is an English explainer with a 3D scene on top. The goal
is reach and citations: show up when a developer searches "hexagonal architecture", and be the
source an AI assistant quotes when it explains the concept. There is nothing to sell.

## Which skill for what

| Skill | Use it for | Ignore |
| --- | --- | --- |
| `seo` (Addy Osmani) | Technical SEO, crawler controls, evidence-led audits. The default authority. | — |
| `core-web-vitals` (Addy Osmani) | LCP, INP, CLS. The 3D stage is the risk. | — |
| `ai-seo` (Corey Haines) | GEO/AEO: extractable passages, citations, AI bot access, third-party presence. | Its SaaS advice: `pricing.md`, review sites, comparison pages and listicles. |
| `schema-markup` (Corey Haines) | Choosing JSON-LD types and checking Google's current rich-result support. | Product, Review and FAQ rich-result recipes. |

Product context for the two Corey Haines skills is in `.claude/product-marketing.md`.

When skills disagree, this file wins, then Google Search Central and the vendors' own crawler docs.
A percentage from a study (the GEO paper, a vendor report) is a hint, never a promise; do not quote
one in site copy or in a commit message as if it were measured on Nightprint.

## Rules

1. **Everything a crawler needs is HTML.** Crawlers and AI fetchers do not run WebGL. A machine page
   must render as server HTML: title, summary, every step of the scenario (title and body, not only
   the current one), the bill of parts with roles, the "what if" switches with their descriptions,
   the article and the sources. Never move content into the canvas or behind a client-only fetch.
   The machine page renders every scenario as text under the article (`RunTranscript`, built by
   `runTranscript()` in `machine-view-model.ts`): each step, and under it the steps a switch plays
   in its place. A new machine gets it for free; check the exported HTML after `pnpm build`.
   The home page tells the featured machine's run too: the concept is named in prose (the hero's
   lead) and in the story's h2 ("Hexagonal architecture, step by step"), and the steps are h3 in an
   ordered list. A step title alone ("Postgres answers") gives a crawler no context.
2. **Metadata per route** with `metadata` / `generateMetadata`, built from `apps/web/components/seo.ts`:
   `metadataBase` is `https://nightprint.dev` (root layout); the machine title is the concept under
   all its names, `title (aliases)`, not the catalogue code (the layout template adds "· Nightprint");
   the description is `machineDescription()`: that title, "explained as a 3D machine you can run",
   then the `summary`; `alternates.canonical` with the trailing slash; Open Graph and X card fields
   through `socialMetadata()`, which every page calls because a page's `openGraph` replaces the
   layout's. Read `node_modules/next/dist/docs` before changing them.
3. **`app/sitemap.ts` and `app/robots.ts`** with `export const dynamic = "force-static"` (required
   with a static export). URLs come from `@nightprint/catalog`: published machines only, never the
   upcoming ones. Add `lastModified` only from a real date; never stamp the build time.
4. **Open Graph image per machine**, rendered at build time in the project's look (tokens only,
   Plex, the machine's plan view drawn from its data): `og-card.tsx`, served by `og.png/route.tsx`
   route handlers, not by `opengraph-image` files, which the export writes without an extension (a
   static server then sends them with no image type). The `?v=` query is the machine's `revised`.
5. **JSON-LD**, as a `<script type="application/ld+json">` in the page, `<` escaped as `\u003c`
   (see the Next.js JSON-LD guide in the bundled docs):
   - home: `WebSite`;
   - machine page: `TechArticle` with `headline`, `description`, `author` (a `Person`), `about` (the
     concept, its `aliases` as `alternateName`), `citation` (the machine's `sources`), `isPartOf` the
     `WebSite`, and `dateModified` from `revised`, the one date the page shows (no `datePublished`
     until a launch date exists); plus a `BreadcrumbList` matching the visible breadcrumb.
   - The author is Ewen, https://x.com/ewenlq (`site.author` in `seo.ts`).
   - Mark up only what the page shows. No `FAQPage` or `HowTo` to chase rich results: Google retired
     HowTo rich results in 2023 and stopped showing FAQ rich results in 2026.
6. **Writing for citation (GEO/AEO)**, in the machine's `article`, `summary` and step bodies:
   - the first sentence of the article defines the concept ("Hexagonal architecture is…");
   - one idea per paragraph, each paragraph understandable on its own;
   - claims tied to the machine's sources; latencies are modelled, say so when you cite one;
   - write for people: no separate "AI version", no chopping a page into fragments, no keyword lists.
   The accuracy rules of `CLAUDE.md` come first: a sentence that reads well but overstates the pattern
   is a bug.
7. **Crawlers**: `robots.ts` allows everything. The search and user-fetch agents (`OAI-SearchBot`,
   `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`, `Claude-SearchBot`, `Claude-User`, Googlebot,
   Bingbot) must stay allowed. Training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`) are
   allowed too: decided 12 Oct 2026, the site is there to be read and cited. Changing that is Ewen's
   decision, not an agent's.
8. **`llms.txt` is optional.** Google ignores it and no vendor documents it as a ranking or citation
   signal. If added, generate it from the catalog in a force-static route handler; never hand-write
   it, and never do it before rules 1 to 7.
9. **Performance**: the largest contentful paint must be text (the title), not the canvas; the scene
   stays a client-only dynamic import, and three.js stays out of the home page bundle. Keep the stage's
   box size fixed (no layout shift) and per-frame work in `useFrame`, not in React state.
10. **Measure, don't guess**: Search Console and Bing Webmaster Tools after launch. For AI answers,
    run each target query (listed in `.claude/product-marketing.md`) 3 to 5 times per assistant and log
    the citation rate with its sample size. Do not run third-party scoring tools (`npx …`) without
    asking.
11. **Public content**: generic business examples (orders, payments); no real company, product or
    client names on the site.
