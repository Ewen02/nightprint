"use client";

import { defineMachine, type Machine, type MachineInput } from "@nightprint/engine";
import {
  Button,
  ConceptArticle,
  FieldNotes,
  FileGrid,
  MonoLabel,
  PageSection,
  RunTranscript,
  SectionHeading,
  SiteFooter,
  SiteHeader,
  SurveySketch,
} from "@nightprint/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImportHero } from "./import-hero";
import { ImportClose, ImportStages, ImportWhatIf } from "./import-sections";
import { MachineView } from "./machine-view";
import { conceptRevision, glossaryTerms, runTranscript } from "./machine-view-model";
import { siteFooter } from "./site-footer-content";
import {
  clock,
  currentParts,
  type DrawingEvent,
  fieldNotes,
  type JobProgress,
  type SketchPart,
  sketchLayout,
} from "./survey-view-model";

/** The importer's address: nightprint.dev/api in production, another port in development. */
const API = `${process.env.NEXT_PUBLIC_IMPORTER_URL ?? ""}/api`;
/** How often a drawing in progress is asked about: often enough to read like a live log. */
const POLL_MS = 1000;
/** How long the units take to close in on their parts before the machine arrives. */
const CLOSING_MS = 1100;
/** Notes that arrive together come in one after the other, this far apart. */
const NOTE_STAGGER_MS = 90;

/** What the importer answers, as far as this page reads it. */
interface Reply {
  readonly id?: string;
  readonly stage?: string;
  readonly attempt?: number;
  readonly error?: string;
  readonly events?: readonly DrawingEvent[];
  readonly reading?: JobProgress["reading"];
  readonly result?: {
    readonly repo: string;
    readonly sha: string;
    readonly model: string;
    readonly machine: MachineInput;
    /** The drafter's plan: its parts say which units each one stands for. */
    readonly blueprint?: {
      readonly parts: readonly SketchPart[];
      /** The composition it chose, and why; absent from drawings made before it chose. */
      readonly layout?: Layout;
    };
  };
  /** The repository has moved on since this drawing: its latest commit, and how far ahead. */
  readonly newer?: Newer;
}

/** How the drafter composed the machine, in its words. */
interface Layout {
  readonly kind: string;
  readonly why: string;
}

/** Each composition, as the sentence about it names it. */
const COMPOSITIONS: Readonly<Record<string, string>> = {
  bands: "bands",
  hub: "a hub",
  mirror: "a mirror",
  bus: "a bus",
};

/** "Drawn as a hub. Most of the code leans on the engine." */
function composition(layout: Layout | undefined): string[] {
  const name = layout && COMPOSITIONS[layout.kind];
  if (!layout || !name || layout.why === "") {
    return [];
  }
  return [`Drawn as ${name}. ${layout.why}`];
}

interface Newer {
  readonly sha: string;
  readonly commits?: number;
}

interface Drawn {
  readonly repo: string;
  readonly sha: string;
  readonly model: string;
  readonly machine: Machine;
  readonly parts: readonly SketchPart[];
  readonly layout?: Layout | undefined;
  readonly newer?: Newer | undefined;
}

/** A drawing under way: the repository asked for, when, and what the importer has said. */
interface Survey {
  readonly repo: string;
  readonly startedAt: number;
  readonly progress?: JobProgress | undefined;
}

type View =
  | { readonly kind: "idle" }
  | ({ readonly kind: "working" } & Survey)
  | ({ readonly kind: "closing"; readonly drawing: Drawn } & Survey)
  | { readonly kind: "drawn"; readonly drawing: Drawn }
  | { readonly kind: "failed"; readonly error: string };

/** The reply of a request, or why there is none. */
async function ask(path: string, init?: RequestInit): Promise<Reply> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, init);
  } catch {
    return { stage: "failed", error: "The drafter cannot be reached; try again in a moment." };
  }
  // The importer answers JSON; this page reads it field by field.
  const reply = (await response.json().catch(() => ({}))) as Reply;
  return response.ok ? reply : { stage: "failed", error: reply.error ?? "Something went wrong." };
}

/** A drawing the engine accepts, or the reason it does not. */
function accept(reply: Reply): { drawing: Drawn } | { error: string } {
  if (reply.stage === "failed" || !reply.result) {
    return { error: reply.error ?? "Something went wrong." };
  }
  try {
    const { repo, sha, model } = reply.result;
    return {
      drawing: {
        repo,
        sha,
        model,
        machine: defineMachine(reply.result.machine),
        parts: reply.result.blueprint?.parts ?? [],
        layout: reply.result.blueprint?.layout,
        newer: reply.newer,
      },
    };
  } catch {
    return { error: "The drawing came back broken; try another commit." };
  }
}

function progressOf(reply: Reply): JobProgress {
  return { events: reply.events ?? [], reading: reply.reading };
}

/**
 * The survey on screen: the surveyor's notes beside the pencil sketch of the repository, as
 * the importer reports them. While closing, the units close in on the parts they became.
 */
function SurveyStage({
  view,
  now,
  shown,
}: {
  readonly view: (
    | { readonly kind: "working" }
    | { readonly kind: "closing"; readonly drawing: Drawn }
  ) &
    Survey;
  readonly now: number;
  /** How many notes were on screen before this render: the rest arrive one after the other. */
  readonly shown: number;
}) {
  const closing = view.kind === "closing";
  const events = view.progress?.events ?? [];
  const notes = fieldNotes(view.repo, view.progress, closing).map((note, index) =>
    index >= shown ? { ...note, delay: (index - shown) * NOTE_STAGGER_MS } : note,
  );
  const surveyed = events.find((e) => e.type === "surveyed");
  const listed = events.find((e) => e.type === "listed");
  const parts = currentParts(events);
  const layout =
    surveyed?.type === "surveyed"
      ? sketchLayout(surveyed.sketch, parts, closing ? view.drawing.parts : undefined)
      : undefined;
  const drafting = events.some((e) => e.type === "answer") && !closing;
  return (
    <PageSection id="survey">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <MonoLabel>{closing ? "Drawn" : drafting ? "Drafting" : "Surveying"}</MonoLabel>
          <h1 className="text-title break-words">{view.repo}</h1>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="lg:order-2">
            {layout ? (
              <div className="flex flex-col gap-3">
                <SurveySketch
                  {...layout}
                  sweeping={drafting}
                  closing={closing}
                  label={`Sketch of ${view.repo}: ${layout.boxes.length} units and ${layout.lines.length} imports between them${parts.length > 0 ? `, ${parts.length} grouped into parts so far` : ""}.`}
                />
                <p className="font-mono text-log text-text-secondary">
                  {layout.boxes.length} units · {layout.lines.length} imports
                  {parts.length > 0 ? ` · ${parts.length} parts drawn` : ""}
                </p>
              </div>
            ) : listed ? (
              <div className="flex flex-col gap-3">
                <FileGrid
                  total={listed.files}
                  done={view.progress?.reading?.done ?? 0}
                  label={`${view.progress?.reading?.done ?? 0} of ${listed.files} files read.`}
                />
                <p className="font-mono text-log text-text-secondary">
                  {view.progress?.reading?.done ?? 0} / {listed.files} files read
                </p>
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="relative aspect-[16/9] overflow-hidden rounded-md border border-line bg-plate"
              >
                <div className="absolute inset-0 animate-sweep motion-reduce:hidden">
                  <div className="h-full w-px bg-line-strong" />
                </div>
              </div>
            )}
          </div>
          <div className="lg:order-1">
            <FieldNotes title="Field notes" clock={clock(now - view.startedAt)} notes={notes} />
          </div>
        </div>
      </div>
    </PageSection>
  );
}

/**
 * The import page: a repository's address in, its machine out. Drawn once per commit,
 * then shared by its address: `?repo=owner/name&sha=…`.
 */
export function ImportView() {
  const [input, setInput] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const polling = useRef<number | undefined>(undefined);
  const closingTimer = useRef<number | undefined>(undefined);
  /** Notes already on screen, so only new ones arrive with a stagger. */
  const shownNotes = useRef(0);

  const arrive = useCallback((drawing: Drawn) => {
    setView({ kind: "drawn", drawing });
    window.history.replaceState(null, "", `?repo=${drawing.repo}&sha=${drawing.sha}`);
    window.scrollTo({ top: 0 });
  }, []);

  /** The end of a drawing under way: the units close in on their parts, then the machine. */
  const finish = useCallback(
    (survey: Survey, reply: Reply) => {
      const accepted = accept(reply);
      if ("error" in accepted) {
        setView({ kind: "failed", error: accepted.error });
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        arrive(accepted.drawing);
        return;
      }
      setView({
        kind: "closing",
        ...survey,
        progress: progressOf(reply),
        drawing: accepted.drawing,
      });
      closingTimer.current = window.setTimeout(() => arrive(accepted.drawing), CLOSING_MS);
    },
    [arrive],
  );

  const follow = useCallback(
    (id: string, survey: Survey) => {
      polling.current = window.setTimeout(async () => {
        const reply = await ask(`/drawings/${id}`);
        if (reply.stage === "done") {
          finish(survey, reply);
        } else if (reply.stage === "failed") {
          setView({ kind: "failed", error: reply.error ?? "Something went wrong." });
        } else {
          const next = { ...survey, progress: progressOf(reply) };
          setView({ kind: "working", ...next });
          follow(id, next);
        }
      }, POLL_MS);
    },
    [finish],
  );

  /** Asks for a repository's drawing; `redraw` draws its latest commit even when an older one exists. */
  const draw = useCallback(
    async (repo: string, redraw = false) => {
      window.clearTimeout(polling.current);
      window.clearTimeout(closingTimer.current);
      shownNotes.current = 0;
      const survey: Survey = { repo: repo.trim(), startedAt: Date.now() };
      setNow(survey.startedAt);
      setView({ kind: "working", ...survey });
      // The survey takes the page's place: start reading it from the top.
      window.scrollTo({ top: 0 });
      const reply = await ask("/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo: survey.repo, redraw }),
      });
      if (reply.stage === "failed") {
        setView({ kind: "failed", error: reply.error ?? "Something went wrong." });
      } else if (reply.stage === "done" || !reply.id) {
        // Drawn before: nothing to survey, the machine arrives at once.
        const accepted = accept(reply);
        if ("error" in accepted) {
          setView({ kind: "failed", error: accepted.error });
        } else {
          arrive(accepted.drawing);
        }
      } else {
        const next = { ...survey, progress: progressOf(reply) };
        setView({ kind: "working", ...next });
        follow(reply.id, next);
      }
    },
    [arrive, follow],
  );

  // The clock in the notes runs while a drawing is under way.
  const surveying = view.kind === "working" || view.kind === "closing";
  useEffect(() => {
    if (!surveying) {
      return;
    }
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [surveying]);

  // Notes on screen after this render: the next render staggers only what is new.
  const noteCount = surveying
    ? fieldNotes(view.repo, view.progress, view.kind === "closing").length
    : 0;
  const shown = shownNotes.current;
  useEffect(() => {
    shownNotes.current = noteCount;
  }, [noteCount]);

  // A shared address opens its drawing; a repository alone only fills the form, since
  // drawing it anew costs the drafter's time and the site's budget.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repo = params.get("repo");
    const sha = params.get("sha");
    if (repo) {
      setInput(repo);
    }
    if (repo && sha && /^[\w.-]+\/[\w.-]+$/.test(repo) && /^[0-9a-f]{40}$/.test(sha)) {
      void ask(`/drawings/${repo}/${sha}`).then((reply) => {
        const accepted = accept(reply);
        if ("error" in accepted) {
          setView({ kind: "failed", error: accepted.error });
        } else {
          arrive(accepted.drawing);
        }
      });
    }
    return () => {
      window.clearTimeout(polling.current);
      window.clearTimeout(closingTimer.current);
    };
  }, [arrive]);

  // Both forms on the page share the address and say why the last drawing failed.
  const form = {
    repo: input,
    onRepoChange: setInput,
    onSubmit: () => void draw(input),
    error: view.kind === "failed" ? view.error : undefined,
  };

  if (view.kind !== "drawn") {
    return (
      <>
        <SiteHeader
          breadcrumb={[{ label: "Nightprint", href: "/" }, { label: "Import" }]}
          meta="Real projects"
        />
        <main>
          {view.kind === "working" || view.kind === "closing" ? (
            <SurveyStage view={view} now={now} shown={shown} />
          ) : (
            <>
              <ImportHero {...form} />
              <ImportWhatIf />
              <ImportStages />
              <ImportClose title="Your repository is next." {...form} />
            </>
          )}
        </main>
        <SiteFooter {...siteFooter} />
      </>
    );
  }

  const { drawing } = view;
  const short = drawing.sha.slice(0, 7);
  return (
    <div className="animate-arrive motion-reduce:animate-none">
      <MachineView
        key={`${drawing.repo}@${drawing.sha}`}
        machine={drawing.machine}
        after={
          <>
            <PageSection id="drawn">
              <SectionHeading
                id="drawn-title"
                eyebrow="Drawn from code"
                title={`${drawing.repo} at ${short}.`}
                lead={[
                  ...composition(drawing.layout),
                  "Every route between two parts stands on an import in the code at this commit, and its arrowhead runs the way the import does.",
                  `The grouping and the words are a language model's (${drawing.model}), checked against the code's imports but not read by a person: a scenario says which part calls which, not what the code does in detail.`,
                  ...(drawing.newer
                    ? [
                        `The repository has moved on since: its latest commit is ${drawing.newer.sha.slice(0, 7)}${drawing.newer.commits === undefined ? "" : `, ${drawing.newer.commits} commit${drawing.newer.commits === 1 ? "" : "s"} ahead`}. Drawing it takes two or three minutes.`,
                      ]
                    : []),
                ]}
              />
              {drawing.newer && (
                <div className="mt-6">
                  <Button onClick={() => void draw(drawing.repo, true)}>
                    Draw the latest commit
                  </Button>
                </div>
              )}
            </PageSection>
            <PageSection id="concept" tone="surface">
              <ConceptArticle
                title={drawing.machine.summary}
                paragraphs={drawing.machine.article}
                terms={glossaryTerms(drawing.machine)}
                sources={drawing.machine.sources}
                revision={conceptRevision(drawing.machine)}
              />
            </PageSection>
            <PageSection id="run">
              <RunTranscript
                eyebrow="The run, step by step"
                title="Every scenario, in words."
                lead={["What the machine plays, step by step."]}
                scenarios={runTranscript(drawing.machine)}
                play="Play"
              />
            </PageSection>
            <ImportClose title="Draw another repository." {...form} />
          </>
        }
        footer={<SiteFooter {...siteFooter} />}
      />
    </div>
  );
}
