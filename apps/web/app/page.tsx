import { hexagonal, machines, projects } from "@nightprint/catalog";
import { flows } from "@nightprint/engine";
import {
  BuildLog,
  type BuildLogEntry,
  ButtonLink,
  FlowDot,
  HomeHeader,
  HomeIntro,
  HomeTemplate,
  PageSection,
  SectionHeading,
  SiteFooter,
} from "@nightprint/ui";
import type { Metadata } from "next";
import { familyLabels, registerSheets } from "../components/catalogue-cards";
import { HomeLegend } from "../components/home/home-legend";
import { HomeRegister } from "../components/home/home-register";
import { ProjectSheet } from "../components/home/project-sheet";
import { RunStory } from "../components/home/run-story";
import { routeLatency, runDuration, scenarioFor } from "../components/home-view-model";
import { JsonLd } from "../components/json-ld";
import { formatMs } from "../components/machine-view-model";
import { annotatedPlan, legendCallouts } from "../components/plan-view-model";
import { previewImage, site, socialMetadata, websiteJsonLd } from "../components/seo";
import { siteFooter } from "../components/site-footer-content";

// The topic first: nobody searches for the name yet.
const title = `${site.tagline.replace(/\.$/, "")} · ${site.name}`;

export const metadata: Metadata = {
  title: { absolute: title },
  description: site.description,
  alternates: { canonical: "/" },
  ...socialMetadata({
    title,
    description: site.description,
    path: "/",
    // The home page changes when a machine is drawn or revised.
    image: previewImage(
      "/",
      machines
        .map((m) => m.revised)
        .sort()
        .at(-1) ?? "",
      "A software architecture pattern drawn as a machine, seen from above, under the Nightprint tagline",
    ),
  }),
};

/** The machine the home page runs and quotes. */
const featured = hexagonal;

/** The real project on the home page's sheet: the newest one. */
const project = projects.at(-1);

/** Rows the build log shows: the rest is on GitHub. */
const BUILD_LOG_SHOWN = 8;

/** Newest first. Posted on X as it happens. */
const buildLog: readonly BuildLogEntry[] = [
  {
    key: "video",
    date: "15 OCT",
    flow: "response",
    tag: "SHIP",
    text: "Every machine now downloads as a video: a 1080p MP4 shot in your browser, frame by frame, with no server involved.",
  },
  {
    key: "compositions",
    date: "15 OCT",
    flow: "request",
    tag: "ARCH",
    text: "A drawn repository is no longer always laid out in bands: the model picks a hub, a mirror or a bus, and the imports must hold it.",
  },
  {
    key: "languages",
    date: "15 OCT",
    flow: "write",
    tag: "FIX",
    text: "A repository with no JavaScript or TypeScript is turned down at once, before the model is paid for.",
  },
  {
    key: "import",
    date: "15 OCT",
    flow: "response",
    tag: "SHIP",
    text: "Draw your own repository at /import: a public JavaScript or TypeScript repo becomes a machine you can run, in about two minutes.",
  },
  {
    key: "prj-001",
    date: "14 OCT",
    flow: "response",
    tag: "SHIP",
    text: "PRJ-001: Nightprint drawn from its own code. Every route between two parts stands on an import the survey found.",
  },
  {
    key: "mch-003",
    date: "13 OCT",
    flow: "response",
    tag: "SHIP",
    text: "MCH-003 is out: Redis cache-aside. Miss, load, cache for 60 s; then three ways to serve a stale price or flood the database.",
  },
  {
    key: "listing",
    date: "13 OCT",
    flow: "write",
    tag: "UI",
    text: "Machines now show the code they run, the line of each step lit. A switch rewrites the code the way it reads.",
  },
  {
    key: "mch-002",
    date: "13 OCT",
    flow: "response",
    tag: "SHIP",
    text: "MCH-002 is out: the JavaScript event loop. A script logs A, D, C, B, and three switches block the stack, freeze the page, or don't.",
  },
  {
    key: "poll",
    date: "12 OCT",
    flow: "request",
    tag: "VOTE",
    text: "MCH-003 is up for a vote on X: domain-driven design, offline-first sync, CQRS + event sourcing or Redis cache-aside.",
  },
  {
    key: "launch",
    date: "12 OCT",
    flow: "response",
    tag: "LAUNCH",
    text: "MCH-001 launches on X: send an order through the hexagon, flip a what-if switch, one machine a week from here.",
  },
  {
    key: "live",
    date: "12 OCT",
    flow: "response",
    tag: "SHIP",
    text: "nightprint.dev is live: a static export on a VPS, republished on every push to main.",
  },
  {
    key: "assembly",
    date: "12 OCT",
    flow: "write",
    tag: "PERF",
    text: "The machine assembles in 1.5 s on first load. Materials compile while the stage is still hidden: no frame over 40 ms once it shows.",
  },
  {
    key: "scroll-story",
    date: "12 OCT",
    flow: "response",
    tag: "UI",
    text: "The home page runs MCH-001 as you scroll: each note plays its step on one drawing sheet that stays put.",
  },
  {
    key: "steps-in-html",
    date: "12 OCT",
    flow: "request",
    tag: "SEO",
    text: "Every step of every scenario is now plain HTML. Crawlers never see the canvas.",
  },
  {
    key: "route-slots",
    date: "12 OCT",
    flow: "write",
    tag: "FIX",
    text: "A what-if switch stalled 166 ms compiling materials. Every route is now mounted up front and fades in: 25 ms.",
  },
  {
    key: "public-repo",
    date: "12 OCT",
    flow: "request",
    tag: "OPEN",
    text: "The repo is public on GitHub. Every commit passes lint, types and tests on its own.",
  },
  {
    key: "drei-html",
    date: "12 OCT",
    flow: "write",
    tag: "FIX",
    text: "drei <Html> + Strict Mode: 9 React errors per page. Part numbers are now one DOM layer.",
  },
  {
    key: "atomic",
    date: "12 OCT",
    flow: "response",
    tag: "UI",
    text: "The design system went atomic: 25 components, none of them knows the engine.",
  },
  {
    key: "ts6",
    date: "12 OCT",
    flow: "response",
    tag: "STACK",
    text: "TypeScript 6, not 7: next build still type-checks through the TS JS API.",
  },
  {
    key: "engine-imports",
    date: "12 OCT",
    flow: "request",
    tag: "ARCH",
    text: "The engine imports neither React nor three. The package graph enforces it.",
  },
  {
    key: "counter-example",
    date: "11 OCT",
    flow: "write",
    tag: "FIX",
    text: "Caught a wrong counter-example: bypassing a port does not invert a dependency.",
  },
  {
    key: "blender",
    date: "11 OCT",
    flow: "request",
    tag: "DRAW",
    text: "First render of the hexagonal core in Blender.",
  },
];

export default function HomePage() {
  const postgresMs = routeLatency(featured, "repo-postgres");
  const duration = runDuration(scenarioFor(featured));
  const machinePage = `/m/${featured.slug}/`;
  // The legend's drawing, and on it one instance of each convention to point at.
  const legend = annotatedPlan(featured, {
    part: "http",
    dimension: "repo-postgres",
    flow: "http-in",
    arrowhead: "pay-provider",
  });
  const legendNotes = {
    balloon: {
      term: "Balloon",
      meaning:
        "A part's number. The same disc marks the part in the scene and its row in the bill of parts: click either, and both light up.",
    },
    dimension: {
      term: "Dimension",
      meaning: `A route's modelled latency: here, ${postgresMs} ms from OrderRepository to Postgres.`,
    },
    flow: {
      term: "Flow colour",
      meaning: "What travels a pipe: a request, a write, a response or an error.",
      swatch: (
        <span className="flex gap-2">
          {flows.map((flow) => (
            <FlowDot key={flow} flow={flow} />
          ))}
        </span>
      ),
    },
    arrowhead: {
      term: "Arrowhead",
      meaning:
        "Which end depends on the other in source code: here the payment provider adapter depends on PaymentGateway, the port the core declares.",
    },
    titleBlock: {
      term: "Title block",
      meaning: "Code, scale, revision, and the reference the machine was checked against.",
    },
  } as const;

  return (
    <HomeTemplate
      header={
        <HomeHeader
          homeHref="#top"
          links={[
            { label: "The run", href: "#run" },
            { label: "Machines", href: "#machines" },
            { label: "Projects", href: "#projects" },
            { label: "Legend", href: "#legend" },
            { label: "Build log", href: "#build-log" },
          ]}
          status={{ label: `${featured.code} is running`, href: "#run" }}
        />
      }
      story={
        <RunStory
          slug={featured.slug}
          opening={
            <HomeIntro
              status={`${featured.code} is running`}
              title="Software architecture, drawn as machines you can run."
              lead={`Each concept is a 3D machine in your browser. Scroll, and a real request travels through the first one, ${featured.title.toLowerCase()}, step by step. Then a switch changes the machine, and you see what the pattern protects you from.`}
              primaryAction={{ label: `Run ${featured.code}`, href: machinePage }}
              secondaryAction={{ label: "See the catalogue", href: "#machines" }}
              cue={`Scroll to run ${featured.code}`}
            />
          }
          intro={
            <SectionHeading
              id="run-title"
              eyebrow={`${featured.code} · ${featured.scenarios[0]?.title ?? ""}`}
              title={`${featured.title}, step by step.`}
              lead={[
                `Also called ${featured.aliases.join(", ")}: ${featured.summary.charAt(0).toLowerCase()}${featured.summary.slice(1)} Scroll, and one order goes through it.`,
              ]}
            />
          }
          cases={[
            // Step 6 of "Place an order": storage answers.
            { action: "swap-storage", step: 6 },
            { action: "core-imports-postgres", with: ["swap-storage"], step: 6 },
          ]}
          closing={
            <div className="flex flex-col gap-6">
              <SectionHeading
                id="run-end-title"
                eyebrow={`End of the run · ${formatMs(duration)}`}
                title="One request, one machine, every step on the record."
                lead={[
                  `On its own page, ${featured.code} plays two more scenarios, a declined payment and an empty order, and lets you flip every switch yourself.`,
                ]}
              />
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={machinePage}>{`Open ${featured.code}`}</ButtonLink>
                <ButtonLink href="#machines" variant="secondary">
                  See the catalogue
                </ButtonLink>
              </div>
            </div>
          }
        />
      }
      footer={<SiteFooter {...siteFooter} />}
    >
      <JsonLd data={websiteJsonLd()} />
      <PageSection id="machines" entrance="rise">
        <HomeRegister
          eyebrow="Drawing register"
          title="Eight machines on the drawing board."
          lead="One is issued each week, and you can say which one comes next on X. Pick a sheet to pull it from the drawer."
          sheets={registerSheets()}
          action={{ label: "Suggest the next one on X", href: site.poll }}
          families={Object.entries(familyLabels).map(([id, label]) => ({ id, label }))}
        />
      </PageSection>

      {project && (
        <PageSection id="projects" tone="surface" entrance="rise">
          <ProjectSheet slug={project.slug} />
        </PageSection>
      )}

      <PageSection id="legend" entrance="rise">
        <HomeLegend
          eyebrow="Legend"
          title="Learn to read one machine, and you can read them all."
          lead="Every machine is drawn with the same symbols. Here they are on MCH-001, seen from above: point at a note, and its line lights up."
          plan={{ ...legend.plan, label: `${featured.title}, seen from above, annotated` }}
          callouts={legendCallouts(legend.plan, legend.targets, [
            "balloon",
            "dimension",
            "flow",
            "arrowhead",
            "titleBlock",
          ]).map((callout) => ({ ...callout, ...legendNotes[callout.key] }))}
          notes={[
            "Latencies are modelled, in milliseconds. They are not measured.",
            "Every machine is checked against the reference in its title block, and never shows a behaviour the real system does not have.",
            `The engine steps at a fixed 1/60 s, so a run plays the same on every screen. ${featured.code} places an order in ${formatMs(duration)} of simulated time.`,
            "Vermillon marks errors and violations, and nothing else.",
          ]}
        />
      </PageSection>

      <PageSection id="build-log" tone="surface" entrance="rise">
        <BuildLog
          eyebrow="Build log"
          title="Built in public, one machine a week."
          lead="The engine, the drawings and the mistakes, posted as they happen."
          // The latest changes; every one of them is a commit on GitHub.
          entries={buildLog.slice(0, BUILD_LOG_SHOWN)}
          history={{ label: "Full history on GitHub", href: `${site.repo}/commits/main` }}
          follow={{ label: `Follow ${site.author.handle} on X`, href: site.author.url }}
        />
      </PageSection>
    </HomeTemplate>
  );
}
