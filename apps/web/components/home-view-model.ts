import {
  logUntil,
  type Machine,
  type ResolvedScenario,
  resolveMachine,
  scenarioOf,
} from "@nightprint/engine";
import type { EventLogEntry, StoryNoteProps, WhatIfItem } from "@nightprint/ui";
import { actionTone, logLine } from "./machine-view-model";

/**
 * Maps a machine to the plain props of the samples on the home page. Every
 * time, log line and latency shown there comes from the machine: when the
 * machine changes, the page follows, and a step, part or route that no
 * longer exists fails the build.
 */

/** The machine's first scenario, resolved for a set of actions. */
export function scenarioFor(machine: Machine, actions: readonly string[] = []): ResolvedScenario {
  return scenarioOf(resolveMachine(machine, actions), machine.scenarios[0]?.id ?? "");
}

/** 1-based number of a step, as the transport prints it. */
export function stepNumberOf(scenario: ResolvedScenario, stepId: string): number {
  const index = scenario.steps.findIndex((s) => s.step.id === stepId);
  if (index < 0) {
    throw new Error(`step "${stepId}" is not played in scenario "${scenario.id}"`);
  }
  return index + 1;
}

/** "Step 5 / 7 · InMemory answers". */
export function stepHeadline(scenario: ResolvedScenario, step: number): string {
  const resolved = scenario.steps[step - 1];
  if (!resolved) {
    throw new Error(`scenario "${scenario.id}" has no step ${step}`);
  }
  return `Step ${step} / ${scenario.steps.length} · ${resolved.step.title}`;
}

/** The log lines written by the given steps (1-based), at their simulated time. */
export function logExcerpt(scenario: ResolvedScenario, steps: readonly number[]): EventLogEntry[] {
  return logUntil(scenario, scenario.steps.length - 1)
    .filter((entry) => steps.includes(entry.stepIndex + 1))
    .map(logLine);
}

/** Simulated time at the end of the scenario. */
export function runDuration(scenario: ResolvedScenario): number {
  return logUntil(scenario, scenario.steps.length - 1).at(-1)?.atMs ?? 0;
}

export function routeLatency(machine: Machine, routeId: string): number {
  const route = machine.routes.find((r) => r.id === routeId);
  if (!route) {
    throw new Error(`${machine.code} has no route "${routeId}"`);
  }
  return route.latencyMs;
}

export interface PartRowItem {
  readonly id: string;
  readonly number: number;
  readonly label: string;
  readonly role: string | undefined;
}

/** Bill-of-parts rows for the given parts, in that order. */
export function partRows(machine: Machine, ids: readonly string[]): PartRowItem[] {
  return ids.map((id) => {
    const part = machine.parts.find((p) => p.id === id);
    if (part?.ref === undefined) {
      throw new Error(`${machine.code} has no numbered part "${id}"`);
    }
    return { id, number: part.ref, label: part.label, role: part.role };
  });
}

/** A "what if" switch as the machine defines it. */
export function whatIfSwitch(
  machine: Machine,
  actionId: string,
): Pick<WhatIfItem, "label" | "description" | "tone"> {
  const action = machine.actions.find((a) => a.id === actionId);
  if (!action) {
    throw new Error(`${machine.code} has no action "${actionId}"`);
  }
  return { label: action.label, description: action.description, tone: actionTone(action) };
}

/** Where the machine stands while a note is read: switches on, and the step it plays. */
export interface StoryMoment {
  readonly actions: readonly string[];
  /** Zero-based step of the machine's first scenario. */
  readonly step: number;
}

/** A note of the home page's story: what it says, and the moment of the machine it plays. */
export interface StoryNoteData extends Omit<StoryNoteProps, "active" | "children"> {
  readonly moment: StoryMoment;
  /** The switch the note flips, for the notes about a "what if". */
  readonly switch?: { readonly action: string } & Pick<
    WhatIfItem,
    "label" | "description" | "tone"
  >;
}

/** A "what if" told in the story: its switch, on top of others, and the step that shows it. */
export interface StoryCase {
  readonly action: string;
  /** Actions on as well, before this one. */
  readonly with?: readonly string[];
  /** The step the note plays (1-based). */
  readonly step: number;
}

/** Balloon numbers of the parts a step is about, as the drawing numbers them. */
function focusNumbers(machine: Machine, ids: readonly string[]): number[] {
  return ids
    .map((id) => machine.parts.find((p) => p.id === id)?.ref)
    .filter((ref): ref is number => ref !== undefined);
}

/** One note per step of the machine's first scenario, switches off. */
export function storySteps(machine: Machine): StoryNoteData[] {
  const scenario = scenarioFor(machine);
  const count = scenario.steps.length;
  return scenario.steps.map((resolved, index) => ({
    id: `step-${resolved.step.id}`,
    eyebrow: `Step ${index + 1} / ${count} · ${scenario.title}`,
    title: resolved.step.title,
    body: resolved.step.body,
    flow: resolved.flow,
    parts: focusNumbers(machine, resolved.step.focus),
    log: logExcerpt(scenario, [index + 1]),
    moment: { actions: [], step: index },
  }));
}

/** One note per case: the step its switches make the machine play instead. */
export function storyWhatIfs(machine: Machine, cases: readonly StoryCase[]): StoryNoteData[] {
  const order = machine.actions.map((a) => a.id);
  return cases.map((item) => {
    const actions = [...(item.with ?? []), item.action].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
    const scenario = scenarioFor(machine, actions);
    const resolved = scenario.steps[item.step - 1];
    if (!resolved) {
      throw new Error(`scenario "${scenario.id}" has no step ${item.step}`);
    }
    return {
      id: `what-if-${item.action}`,
      eyebrow: `What if · Step ${item.step} / ${scenario.steps.length}`,
      title: resolved.step.title,
      body: resolved.step.body,
      flow: resolved.flow,
      parts: focusNumbers(machine, resolved.step.focus),
      log: logExcerpt(scenario, [item.step]),
      moment: { actions, step: item.step - 1 },
      switch: { action: item.action, ...whatIfSwitch(machine, item.action) },
    };
  });
}
