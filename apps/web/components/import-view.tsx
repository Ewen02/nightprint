"use client";

import { defineMachine, type Machine, type MachineInput } from "@nightprint/engine";
import {
  ConceptArticle,
  ImportPanel,
  type ImportStage,
  PageSection,
  RunTranscript,
  SectionHeading,
  SiteFooter,
  SiteHeader,
} from "@nightprint/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { MachineView } from "./machine-view";
import { conceptRevision, glossaryTerms, runTranscript } from "./machine-view-model";
import { siteFooter } from "./site-footer-content";

/** The importer's address: nightprint.dev/api in production, another port in development. */
const API = `${process.env.NEXT_PUBLIC_IMPORTER_URL ?? ""}/api`;
/** How often a drawing in progress is asked about. */
const POLL_MS = 2000;

/** What the importer answers, as far as this page reads it. */
interface Reply {
  readonly id?: string;
  readonly stage?: string;
  readonly attempt?: number;
  readonly error?: string;
  readonly result?: {
    readonly repo: string;
    readonly sha: string;
    readonly model: string;
    readonly machine: MachineInput;
  };
}

interface Drawn {
  readonly repo: string;
  readonly sha: string;
  readonly model: string;
  readonly machine: Machine;
}

type View =
  | { readonly kind: "idle" }
  | { readonly kind: "working"; readonly stage: string; readonly attempt?: number | undefined }
  | { readonly kind: "drawn"; readonly drawing: Drawn }
  | { readonly kind: "failed"; readonly error: string };

const STAGES = [
  { stage: "queued", label: "In line for the drafter" },
  { stage: "reading", label: "Reading the repository" },
  { stage: "surveying", label: "Surveying its imports" },
  { stage: "drawing", label: "Drawing, then checking every route" },
] as const;

function stagesOf(view: View): ImportStage[] {
  if (view.kind !== "working") {
    return [];
  }
  const current = STAGES.findIndex((s) => s.stage === view.stage);
  return STAGES.map((s, i) => ({
    label:
      s.stage === "drawing" && i === current && (view.attempt ?? 1) > 1
        ? `Drawing again: answer ${view.attempt} of 3`
        : s.label,
    state: i < current ? "done" : i === current ? "current" : "upcoming",
  }));
}

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
function accept(reply: Reply): View {
  if (reply.stage === "failed" || !reply.result) {
    return { kind: "failed", error: reply.error ?? "Something went wrong." };
  }
  try {
    const { repo, sha, model } = reply.result;
    return {
      kind: "drawn",
      drawing: { repo, sha, model, machine: defineMachine(reply.result.machine) },
    };
  } catch {
    return { kind: "failed", error: "The drawing came back broken; try another commit." };
  }
}

/**
 * The import page: a repository's address in, its machine out. Drawn once per commit,
 * then shared by its address: `?repo=owner/name&sha=…`.
 */
export function ImportView() {
  const [input, setInput] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const polling = useRef<number | undefined>(undefined);

  const show = useCallback((next: View) => {
    setView(next);
    if (next.kind === "drawn") {
      const { repo, sha } = next.drawing;
      window.history.replaceState(null, "", `?repo=${repo}&sha=${sha}`);
      window.scrollTo({ top: 0 });
    }
  }, []);

  const follow = useCallback(
    (id: string) => {
      polling.current = window.setTimeout(async () => {
        const reply = await ask(`/drawings/${id}`);
        if (reply.stage === "done" || reply.stage === "failed") {
          show(accept(reply));
        } else {
          setView({ kind: "working", stage: reply.stage ?? "queued", attempt: reply.attempt });
          follow(id);
        }
      }, POLL_MS);
    },
    [show],
  );

  const draw = useCallback(async () => {
    window.clearTimeout(polling.current);
    setView({ kind: "working", stage: "queued" });
    const reply = await ask("/drawings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repo: input.trim() }),
    });
    if (reply.stage === "done" || reply.stage === "failed" || !reply.id) {
      show(accept(reply));
    } else {
      setView({ kind: "working", stage: reply.stage ?? "queued", attempt: reply.attempt });
      follow(reply.id);
    }
  }, [input, follow, show]);

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
      setView({ kind: "working", stage: "reading" });
      void ask(`/drawings/${repo}/${sha}`).then((reply) => show(accept(reply)));
    }
    return () => window.clearTimeout(polling.current);
  }, [show]);

  const panel = (
    <ImportPanel
      eyebrow="Your repository, as a machine"
      title={view.kind === "drawn" ? "Draw another repository." : "Draw a repository."}
      lead={[
        "Paste a public GitHub repository. Its code is read for its packages, imports and libraries; a model groups them into parts and writes the scenarios, and every route it draws must stand on an import the code has.",
      ]}
      form={{
        value: input,
        onChange: setInput,
        onSubmit: () => void draw(),
        busy: view.kind === "working",
        label: "GitHub repository",
        placeholder: "owner/name or https://github.com/owner/name",
        action: "Draw it",
      }}
      stages={stagesOf(view)}
      error={view.kind === "failed" ? view.error : undefined}
      note="JavaScript and TypeScript, public repositories, up to 3,000 source files. A repository is drawn once per commit; a few new drawings per visitor a day."
    />
  );

  if (view.kind !== "drawn") {
    return (
      <>
        <SiteHeader
          breadcrumb={[{ label: "Nightprint", href: "/" }, { label: "Import" }]}
          meta="Real projects"
        />
        <main>
          <PageSection id="import">{panel}</PageSection>
        </main>
        <SiteFooter {...siteFooter} />
      </>
    );
  }

  const { drawing } = view;
  const short = drawing.sha.slice(0, 7);
  return (
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
                "Every route between two parts stands on an import in the code at this commit, and its arrowhead runs the way the import does.",
                `The grouping and the words are a language model's (${drawing.model}), checked against the code's imports but not read by a person: a scenario says which part calls which, not what the code does in detail.`,
              ]}
            />
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
          <PageSection id="import" tone="surface">
            {panel}
          </PageSection>
        </>
      }
      footer={<SiteFooter {...siteFooter} />}
    />
  );
}
