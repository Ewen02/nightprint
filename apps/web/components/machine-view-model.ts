import {
  type Action,
  type LogEntry,
  type Machine,
  outputUntil,
  type PlayerSnapshot,
  type ResolvedScenario,
  resolveMachine,
} from "@nightprint/engine";
import type {
  BillOfPartsItem,
  CartoucheProps,
  CodeListingProps,
  ConceptArticleProps,
  EventLogEntry,
  FlowLegendProps,
  PartCalloutProps,
  RunScenario,
  RunStepVariant,
  ScenarioEndProps,
  StepDotItem,
  TermEntryProps,
  TransportProps,
  WhatIfItem,
} from "@nightprint/ui";
import { momentQuery } from "./machine-link";

/**
 * Maps the engine's snapshot to the plain props of the UI organisms.
 * The UI package never imports the engine; this file is the seam.
 */

export function billOfPartsItems(snapshot: PlayerSnapshot): BillOfPartsItem[] {
  // At the end the machine is at rest: no part is the step's any more.
  const focus = new Set(snapshot.finished ? [] : snapshot.step.step.focus);
  return snapshot.resolved.parts
    .filter((part): part is typeof part & { ref: number } => part.ref !== undefined)
    .sort((a, b) => a.ref - b.ref)
    .map((part) => ({
      id: part.id,
      number: part.ref,
      label: part.label,
      role: part.role,
      flow: focus.has(part.id) ? snapshot.step.flow : null,
      violation: part.flag === "violation",
    }));
}

/** Simulated time as the log prints it. */
export function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}

/** An action that flags a part or a route as a violation is a counter-example. */
export function actionTone(action: Action): WhatIfItem["tone"] {
  const violation = action.effects.some(
    (e) =>
      (e.type === "patchPart" && e.set.flag === "violation") ||
      (e.type === "addRoute" && e.route.flag === "violation"),
  );
  return violation ? "violation" : "safe";
}

export function stepDotItems(scenario: ResolvedScenario): StepDotItem[] {
  return scenario.steps.map((s) => ({ id: s.step.id, title: s.step.title, flow: s.flow }));
}

/** What the stage shows, for screen readers. */
export function stageLabel(snapshot: PlayerSnapshot): string {
  const { resolved, state, stepCount, step } = snapshot;
  return `${resolved.machine.title}, step ${state.stepIndex + 1} of ${stepCount}: ${step.step.title}. ${step.step.body}`;
}

export function whatIfItems(machine: Machine, snapshot: PlayerSnapshot): WhatIfItem[] {
  return machine.actions.map((action) => ({
    id: action.id,
    label: action.label,
    description: action.description,
    tone: actionTone(action),
    on: snapshot.state.actions.includes(action.id),
  }));
}

export function logLine(entry: LogEntry): EventLogEntry {
  return {
    key: entry.key,
    time: formatMs(entry.atMs),
    flow: entry.flow,
    tag: entry.tag,
    text: entry.text,
  };
}

export function eventLogEntries(snapshot: PlayerSnapshot): EventLogEntry[] {
  return snapshot.log.map(logLine);
}

/**
 * What the exploded view shows: the core alone with its ports, or the adapters it
 * cannot let go of, those a route that breaks the pattern ties to it.
 */
export function unplugNote(snapshot: PlayerSnapshot): string {
  const { parts, routes } = snapshot.resolved;
  const tied = parts.filter(
    (part) =>
      part.kind === "adapter" &&
      routes.some((r) => r.flag === "violation" && (r.from === part.id || r.to === part.id)),
  );
  if (tied.length === 0) {
    return "Every adapter is off. The core and its ports stand alone.";
  }
  const names = tied.map((part) => `the ${part.label}`).join(" and ");
  const what = `${names.charAt(0).toUpperCase()}${names.slice(1)}`;
  return `${what} cannot come off: the core imports ${tied.length > 1 ? "them" : "it"}.`;
}

export function cartoucheProps(machine: Machine): CartoucheProps {
  return {
    title: machine.title,
    code: machine.code,
    scale: machine.scale,
    revision: machine.revision,
    source: machine.sources[0],
  };
}

export function transportData(
  snapshot: PlayerSnapshot,
): Pick<TransportProps, "scenario" | "steps" | "current" | "caption" | "playing" | "finished"> {
  const { scenario, state, step, finished } = snapshot;
  return {
    scenario: scenario.title,
    steps: stepDotItems(scenario),
    current: state.stepIndex,
    caption: { title: step.step.title, body: step.step.body, flow: step.flow },
    playing: state.mode === "playing",
    finished,
  };
}

export interface CalloutItem extends PartCalloutProps {
  readonly id: string;
}

/**
 * What each numbered part says in the scene: the parts of the current step and
 * the one under the pointer show their name, the selected one its role and
 * description too, the others their number only.
 */

export function partCallouts(
  snapshot: PlayerSnapshot,
  selected: string | null = null,
  hovered: string | null = null,
  /** How many of the step's parts are named at once: two on a wide stage, one on a phone. */
  namedPerStep = 2,
): CalloutItem[] {
  // At the end the machine is at rest: no part is the step's any more.
  const focus = new Set(snapshot.finished ? [] : snapshot.step.step.focus);
  // Named on the stage: a part with something to say this step (the event loop's phase)
  // first, then the step's parts in the order it lists them, up to `namedPerStep`. More
  // names crowd each other and the dimensions; the rest keep their lit balloon.
  const states = snapshot.finished ? {} : snapshot.step.step.states;
  const named = new Set([...new Set([...Object.keys(states), ...focus])].slice(0, namedPerStep));
  return snapshot.resolved.parts
    .filter((part): part is typeof part & { ref: number } => part.ref !== undefined)
    .map((part) => {
      const focused = focus.has(part.id);
      const status = named.has(part.id) ? states[part.id] : undefined;
      return {
        id: part.id,
        number: part.ref,
        label: part.label,
        role: part.role,
        description: part.description,
        flow: focused ? snapshot.step.flow : null,
        violation: part.flag === "violation",
        status,
        detail:
          part.id === selected
            ? "full"
            : named.has(part.id) || part.id === hovered
              ? "name"
              : "number",
      };
    });
}

/**
 * The program the machine runs, as the listing beside the stage shows it: the line of
 * the current step lit in its colour, and what the program has printed so far. Null for
 * a machine without a listing.
 */
export function programListing(snapshot: PlayerSnapshot): CodeListingProps | null {
  // As the switches leave it: they may change a line of the program or add one.
  const listing = snapshot.resolved.listing;
  if (listing.length === 0) {
    return null;
  }
  const running = snapshot.finished
    ? -1
    : listing.findIndex((line) => line.id === snapshot.step.step.line);
  return {
    lines: listing.map((line) => line.text),
    current: running < 0 ? null : running + 1,
    flow: snapshot.step.flow,
    // A console only for a program that prints something, under some switch.
    output: snapshot.resolved.machine.scenarios.some((s) =>
      s.steps.some((step) => step.output.length > 0),
    )
      ? outputUntil(snapshot.scenario, snapshot.state.stepIndex)
      : undefined,
  };
}

/** What each flow colour means in this machine: its own words, or the default ones. */
export function flowLegend(machine: Machine): FlowLegendProps["items"] {
  const labels = machine.flowLabels;
  return [
    { flow: "request", label: labels.request ?? "Request" },
    { flow: "write", label: labels.write ?? "Write" },
    { flow: "response", label: labels.response ?? "Response" },
    { flow: "error", label: labels.error ?? "Error" },
  ];
}

/** The drawing shows a dependency arrowhead somewhere, under some switch. */
export function drawsDependencies(machine: Machine): boolean {
  const added = machine.actions.flatMap((a) =>
    a.effects.flatMap((e) => (e.type === "addRoute" ? [e.route] : [])),
  );
  return [...machine.routes, ...added].some((route) => route.dependsOn !== undefined);
}

/** The exploded view has something to unplug: adapters. */
export function hasAdapters(machine: Machine): boolean {
  return machine.parts.some((part) => part.kind === "adapter");
}

/** The machine's glossary, each term with the balloon numbers of the parts it names. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The revision under the article: "Rev A", on the day it was drawn ("12 Oct 2026"). */
export function conceptRevision(machine: Machine): NonNullable<ConceptArticleProps["revision"]> {
  const [year, month, day] = machine.revised.split("-").map(Number);
  return {
    label: `Rev ${machine.revision}`,
    date: machine.revised,
    display: `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`,
  };
}

/**
 * Every scenario in words: the steps that play with no switch on, and beside each
 * one, what the switches put in its place or add right after it. A variant is placed
 * by the run it plays in, under exactly the switches its condition needs: counted from
 * the last base step before it, it stands in for the base step at the same distance
 * when that one no longer plays, and otherwise it is an addition after that base step.
 */
export function runTranscript(machine: Machine): RunScenario[] {
  const runOf = (actions: readonly string[], scenarioId: string) =>
    resolveMachine(machine, actions).scenarios.find((s) => s.id === scenarioId)?.steps ?? [];
  const order = machine.actions.map((a) => a.id);
  const labels = new Map(machine.actions.map((a) => [a.id, a.label]));
  const tones = new Map(machine.actions.map((a) => [a.id, actionTone(a)]));
  return machine.scenarios.map((scenario) => {
    const base = runOf([], scenario.id);
    const shown = new Set(base.map((s) => s.step.id));
    const baseIndex = new Map(base.map((s) => [s.step.id, s.index]));
    const variants = new Map<number, RunStepVariant[]>();
    for (const step of scenario.steps.filter((s) => !shown.has(s.id))) {
      const on = [...(step.when?.all ?? [])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const run = runOf(on, scenario.id);
      const played = run.find((s) => s.step.id === step.id);
      if (!played) {
        continue;
      }
      const anchorRun = run.findLastIndex((s, i) => i < played.index && baseIndex.has(s.step.id));
      const anchorBase = anchorRun < 0 ? -1 : (baseIndex.get(run[anchorRun]?.step.id ?? "") ?? -1);
      const standsFor = base[anchorBase + played.index - anchorRun];
      const replaces = standsFor !== undefined && !run.some((s) => s.step.id === standsFor.step.id);
      const at = replaces ? standsFor.index : Math.max(anchorBase, 0);
      variants.set(at, [
        ...(variants.get(at) ?? []),
        {
          key: step.id,
          when: on.map((id) => labels.get(id) ?? id).join(" + "),
          title: step.title,
          body: step.body,
          flow: played.flow,
          tone: on.some((id) => tones.get(id) === "violation") ? "violation" : "safe",
          adds: !replaces,
          href: momentQuery(machine, { scenario: scenario.id, actions: on, step: played.index }),
        },
      ]);
    }
    return {
      id: scenario.id,
      title: scenario.title,
      steps: base.map((s) => ({
        number: s.index + 1,
        title: s.step.title,
        body: s.step.body,
        flow: s.flow,
        variants: variants.get(s.index) ?? [],
        href: momentQuery(machine, { scenario: scenario.id, actions: [], step: s.index }),
      })),
    };
  });
}

export function glossaryTerms(machine: Machine): TermEntryProps[] {
  const refs = new Map(machine.parts.map((part) => [part.id, part.ref]));
  return machine.glossary.map((entry) => ({
    term: entry.term,
    definition: entry.definition,
    numbers: entry.parts
      .map((id) => refs.get(id))
      .filter((ref): ref is number => ref !== undefined),
  }));
}

/**
 * The end of a scenario, once it has played: how long it took and what came out,
 * read from the log so it is right under every combination of switches, and what
 * to try next. A suggestion id is `action:<id>` or `scenario:<id>`.
 */
export function scenarioEnding(
  machine: Machine,
  snapshot: PlayerSnapshot,
): Omit<ScenarioEndProps, "onSuggestion"> | null {
  if (!snapshot.finished) {
    return null;
  }
  const last = snapshot.log.at(-1);
  const untried = machine.actions
    .filter((action) => !snapshot.state.actions.includes(action.id))
    .map((action) => ({ id: `action:${action.id}`, label: action.label }));
  const others = machine.scenarios
    .filter((scenario) => scenario.id !== snapshot.state.scenarioId)
    .map((scenario) => ({ id: `scenario:${scenario.id}`, label: scenario.title }));
  // Two at most: a switch (the point of the machine), then another story, or another switch.
  const suggestions = [untried[0], others[0] ?? untried[1]].filter(
    (s): s is { id: string; label: string } => s !== undefined,
  );
  // A run that ends on an error never finished: it stopped there.
  const stuck = snapshot.step.flow === "error";
  return {
    count: snapshot.stepCount,
    title: `${stuck ? "Stuck after" : "Done in"} ${formatMs(last?.atMs ?? 0)}`,
    result: last?.text ?? "",
    suggestions,
  };
}
