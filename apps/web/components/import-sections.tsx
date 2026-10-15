"use client";

import {
  DrawingNotes,
  DrawingStages,
  FileGrid,
  FlowDot,
  MonoLabel,
  PageSection,
  PlanView,
  RepoForm,
  SectionHeading,
  SurveySketch,
  WhatIfSwitch,
} from "@nightprint/ui";
import { useMemo, useState } from "react";
import { machineBySlug } from "./home/machine-by-slug";
import { whatIfSwitch } from "./home-view-model";
import { SAMPLE_PROJECT } from "./import-hero";
import { planView } from "./plan-view-model";
import { prj001Survey } from "./prj-001-survey";
import { sketchLayout } from "./survey-view-model";

/** The switch the import page flips on PRJ-001: the seam between the UI kit and the engine. */
const SAMPLE_ACTION = "import-engine-in-ui";

/** What a drawing comes with: a what-if switch of PRJ-001, flipped on its plan. */
export function ImportWhatIf() {
  const machine = useMemo(() => machineBySlug(SAMPLE_PROJECT), []);
  const toggle = whatIfSwitch(machine, SAMPLE_ACTION);
  const [on, setOn] = useState(false);
  const plan = useMemo(() => planView(machine, on ? [SAMPLE_ACTION] : []), [machine, on]);
  return (
    <PageSection id="what-if" entrance="rise">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
        <figure className="m-0 flex flex-col gap-3 border border-line-strong bg-bg p-4 sm:p-6">
          <PlanView
            {...plan}
            label={`${machine.title} seen from above${on ? `, with the switch “${toggle.label}” on` : ""}`}
            flowing
            className="block h-auto w-full"
          />
          <figcaption className="mono-label text-text-faint">
            {`${machine.code} · ${machine.title} · seen from above`}
          </figcaption>
        </figure>
        <div className="flex flex-col gap-5">
          <MonoLabel>What if…</MonoLabel>
          <h2 className="text-title sm:text-display">
            The seam{" "}
            <span className={on ? "text-flow-error" : undefined}>{on ? "breaks" : "holds"}</span>.
          </h2>
          <p className="text-body text-text-muted">
            Every drawing comes with switches named like test cases. Each one adds an import the
            code does not have, and the machine shows what its structure was protecting. This one
            comes from {machine.code}.
          </p>
          <WhatIfSwitch {...toggle} on={on} onToggle={setOn} />
        </div>
      </div>
    </PageSection>
  );
}

/** How a repository becomes a machine, shown on PRJ-001 as it was drawn. */
export function ImportStages() {
  const machine = useMemo(() => machineBySlug(SAMPLE_PROJECT), []);
  const { files, sketch, parts } = prj001Survey;
  const source = machine.sources[0]?.label ?? machine.title;
  const stages = useMemo(
    () => [
      {
        key: "read",
        label: "Read",
        count: `${files} files`,
        title: "Every file, at one commit.",
        body: "The JavaScript and TypeScript sources are read from GitHub at the commit the drawing will name, and nowhere else.",
        figure: <FileGrid total={files} done={files} label={`${files} of ${files} files read.`} />,
      },
      {
        key: "survey",
        label: "Survey",
        count: `${sketch.units.length} units · ${sketch.edges.length} imports`,
        title: "The imports, without a model.",
        body: "Packages and folders become units, and every import between two of them is recorded. These are the facts the drawing has to keep.",
        figure: (
          <SurveySketch
            {...sketchLayout(sketch, [])}
            sweeping={false}
            closing={false}
            label={`Sketch of ${source}: ${sketch.units.length} units and ${sketch.edges.length} imports between them.`}
          />
        ),
      },
      {
        key: "group",
        label: "Group",
        count: `${parts.length} parts from the code`,
        title: "A model groups them into parts.",
        body: "It names the parts and writes the scenarios. A route that no import backs is sent back to it, until every route stands on the code.",
        // The parts given as final too: every unit reads as grouped, none as just written.
        figure: (
          <SurveySketch
            {...sketchLayout(sketch, parts, parts)}
            sweeping={false}
            closing={false}
            label={`The same units, each named after the part it went into: ${parts.map((p) => p.label).join(", ")}.`}
          />
        ),
      },
      {
        key: "run",
        label: "Run",
        count: `${machine.scenarios.length} scenarios · ${machine.actions.length} what-ifs`,
        title: "The machine runs.",
        body: "It plays step by step like the machines in the catalogue, with its what-if switches, and keeps a link you can share.",
        figure: (
          <PlanView
            {...planView(machine)}
            label={`${machine.title} seen from above`}
            flowing
            className="block h-auto w-full"
          />
        ),
      },
    ],
    [machine, source],
  );
  return (
    <PageSection id="stages" tone="surface" entrance="rise">
      <div className="flex flex-col gap-9">
        <div className="max-w-155">
          <SectionHeading
            id="stages-title"
            eyebrow="From repository to machine"
            title="Four stages, about two minutes."
            lead={[
              `Here is how ${machine.code} was drawn from ${source}. Your repository goes through the same four, and you watch each one happen.`,
            ]}
          />
        </div>
        <DrawingStages label="Stages of a drawing" stages={stages} />
      </div>
    </PageSection>
  );
}

export interface ImportCloseProps {
  readonly title: string;
  readonly repo: string;
  readonly onRepoChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly error?: string | undefined;
}

/** The page's last word: the form again, and what a drawing can and cannot see. */
export function ImportClose({ title, repo, onRepoChange, onSubmit, error }: ImportCloseProps) {
  return (
    <PageSection id="draw" entrance="rise">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <MonoLabel flow="request" className="flex items-center gap-2.5">
            <FlowDot flow="request" />
            Next on the board
          </MonoLabel>
          <h2 className="text-title sm:text-display">{title}</h2>
          <RepoForm
            id="repo-next"
            value={repo}
            onChange={onRepoChange}
            onSubmit={onSubmit}
            label="GitHub repository"
            placeholder="owner/name"
            action="Draw it"
            describedBy="draw-status"
          />
          <div id="draw-status" role="status" aria-live="polite">
            {error && <p className="text-small text-flow-error">{error}</p>}
          </div>
        </div>
        <DrawingNotes
          heading="Notes"
          notes={[
            "JavaScript and TypeScript, in public repositories of up to 3,000 source files.",
            "Only static imports are seen: calls between services, queues and injected dependencies are not.",
            "A model groups the code into parts and writes the steps. Every route is checked against the imports; the words are not read by a person.",
            "A repository is drawn once per commit, and its link keeps that drawing. A few new drawings per visitor a day.",
          ]}
        />
      </div>
    </PageSection>
  );
}
