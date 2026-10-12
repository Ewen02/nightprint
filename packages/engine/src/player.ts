import { clamp01, easeInOutCubic, pointAlong } from "./geometry";
import { type LogEntry, logUntil } from "./log";
import {
  actionsKey,
  type ResolvedMachine,
  type ResolvedScenario,
  type ResolvedStep,
  resolveMachine,
} from "./resolve";
import type { Flow, Machine, Step, Vec3 } from "./schema";

/** The simulation advances in fixed steps of 1/60 s; rendering interpolates. */
export const FIXED_STEP_MS = 1000 / 60;
/** Beyond this many fixed steps in one frame (tab in background), time is dropped, not caught up. */
const MAX_STEPS_PER_ADVANCE = 10;
const EPSILON = 1e-6;

/** `stepping` plays the current step once, then pauses. */
export type RunMode = "playing" | "stepping" | "paused";

/**
 * How long a step lasts when the scenario plays on its own. `animation`: as long
 * as its tokens travel. `reading`: also long enough to read its caption, so a
 * visitor who lets it play can follow the story.
 */
export type Pace = "animation" | "reading";

/**
 * A quick read, about 400 words a minute, plus a moment to look up at the scene.
 * The caption stays on screen after the step anyway, and Next skips ahead.
 */
const READING_BASE_MS = 250;
const READING_MS_PER_WORD = 150;

/** Time to read a step's title and body, in ms. */
export function readingMs(step: Step): number {
  const words = `${step.title} ${step.body}`.trim().split(/\s+/).length;
  return READING_BASE_MS + words * READING_MS_PER_WORD;
}

export interface PlayerState {
  readonly scenarioId: string;
  readonly stepIndex: number;
  /** Fixed steps elapsed in the current step. */
  readonly ticks: number;
  readonly mode: RunMode;
  /** Active action ids, in declaration order. */
  readonly actions: readonly string[];
  /** Tokens jump to the end of each step instead of travelling. */
  readonly reducedMotion: boolean;
  readonly pace: Pace;
}

export type PlayerEvent =
  | { readonly type: "play" }
  | { readonly type: "pause" }
  | { readonly type: "togglePlay" }
  | { readonly type: "next" }
  | { readonly type: "prev" }
  | { readonly type: "seek"; readonly step: number }
  | { readonly type: "setAction"; readonly action: string; readonly active: boolean }
  | { readonly type: "setScenario"; readonly scenario: string }
  | { readonly type: "setReducedMotion"; readonly value: boolean };

type Resolve = (actions: readonly string[]) => ResolvedMachine;

export function ticksFor(step: ResolvedStep): number {
  return Math.max(1, Math.round(step.step.durationMs / FIXED_STEP_MS));
}

export function scenarioOf(resolved: ResolvedMachine, scenarioId: string): ResolvedScenario {
  const scenario = resolved.scenarios.find((s) => s.id === scenarioId) ?? resolved.scenarios[0];
  if (!scenario) {
    throw new Error(`machine ${resolved.machine.code} has no scenario`);
  }
  return scenario;
}

function stepOf(scenario: ResolvedScenario, index: number): ResolvedStep {
  const step = scenario.steps[Math.min(index, scenario.steps.length - 1)];
  if (!step) {
    throw new Error(`scenario "${scenario.id}" has no step`);
  }
  return step;
}

/** Enters a step: from its start, or straight to its end with reduced motion. */
function enter(
  state: PlayerState,
  scenario: ResolvedScenario,
  index: number,
  mode: RunMode,
): PlayerState {
  const stepIndex = Math.max(0, Math.min(index, scenario.steps.length - 1));
  if (state.reducedMotion && mode === "stepping") {
    return { ...state, stepIndex, ticks: ticksFor(stepOf(scenario, stepIndex)), mode: "paused" };
  }
  return { ...state, stepIndex, ticks: 0, mode };
}

function isFinished(state: PlayerState, scenario: ResolvedScenario): boolean {
  const last = scenario.steps.length - 1;
  return state.stepIndex === last && state.ticks >= ticksFor(stepOf(scenario, last));
}

/** Applies a discrete event. Pure. */
export function reduce(state: PlayerState, event: PlayerEvent, resolve: Resolve): PlayerState {
  const scenario = scenarioOf(resolve(state.actions), state.scenarioId);
  switch (event.type) {
    case "play":
      return isFinished(state, scenario)
        ? enter(state, scenario, 0, "playing")
        : { ...state, mode: "playing" };
    case "pause":
      return state.mode === "paused" ? state : { ...state, mode: "paused" };
    case "togglePlay":
      return reduce(state, { type: state.mode === "playing" ? "pause" : "play" }, resolve);
    case "next":
      return state.stepIndex >= scenario.steps.length - 1
        ? state
        : enter(state, scenario, state.stepIndex + 1, "stepping");
    case "prev":
      return enter(state, scenario, state.stepIndex - 1, "stepping");
    case "seek":
      return enter(state, scenario, event.step, "stepping");
    case "setAction": {
      const set = new Set(state.actions);
      if (event.active) {
        set.add(event.action);
      } else {
        set.delete(event.action);
      }
      const resolved = resolve([...set]);
      const next = { ...state, actions: resolved.actions };
      return enter(
        next,
        scenarioOf(resolved, state.scenarioId),
        state.stepIndex,
        state.mode === "playing" ? "playing" : "stepping",
      );
    }
    case "setScenario": {
      // Choosing a scenario is asking to watch it: from its first step, playing.
      const chosen = scenarioOf(resolve(state.actions), event.scenario);
      return enter({ ...state, scenarioId: chosen.id }, chosen, 0, "playing");
    }
    case "setReducedMotion":
      return state.reducedMotion === event.value ? state : { ...state, reducedMotion: event.value };
  }
}

/** Advances the simulation by one fixed step. Pure and deterministic. */
export function tick(state: PlayerState, resolve: Resolve): PlayerState {
  if (state.mode === "paused") {
    return state;
  }
  const scenario = scenarioOf(resolve(state.actions), state.scenarioId);
  const step = stepOf(scenario, state.stepIndex);
  const total = ticksFor(step);
  const last = state.stepIndex >= scenario.steps.length - 1;
  // A step played in a run waits, its animation done, until its caption has been read.
  // Played on its own or as the last one, it pauses at its end and the caption stays.
  const held = state.mode === "playing" && !last && state.pace === "reading";
  const end = held ? Math.max(total, Math.round(readingMs(step.step) / FIXED_STEP_MS)) : total;
  const ticks = state.ticks + 1;
  if (ticks < end) {
    return { ...state, ticks };
  }
  if (state.mode === "stepping" || last) {
    return { ...state, ticks: total, mode: "paused" };
  }
  return { ...state, stepIndex: state.stepIndex + 1, ticks: 0 };
}

export interface PlayerSnapshot {
  readonly state: PlayerState;
  readonly resolved: ResolvedMachine;
  readonly scenario: ResolvedScenario;
  readonly step: ResolvedStep;
  readonly stepCount: number;
  readonly finished: boolean;
  readonly log: readonly LogEntry[];
}

export interface TokenFrame {
  readonly kind: "travel" | "hold";
  readonly flow: Flow;
  readonly position: Vec3;
}

export interface Frame {
  readonly stepIndex: number;
  /** Linear progress through the step, 0 to 1. */
  readonly progress: number;
  /** Eased progress, the one tokens follow. */
  readonly eased: number;
  readonly tokens: readonly TokenFrame[];
  /**
   * Seconds the player has run, paused or not. Never goes back. For ambient
   * details that belong to the machine, not to a step: sparks over a violation
   * keep rising while the scenario waits. Scenario details read `progress`.
   */
  readonly clock: number;
}

export interface Player {
  readonly machine: Machine;
  /** Discrete state for the UI. Same object until the step, mode or actions change. */
  getSnapshot(): PlayerSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(event: PlayerEvent): void;
  /** Feeds real elapsed time; runs as many fixed steps as it covers. */
  advance(dtMs: number): void;
  /** Interpolated frame for rendering. Call once per rendered frame. */
  sample(): Frame;
  /** Exact simulation state, ticks included. */
  getState(): PlayerState;
}

export interface PlayerOptions {
  readonly scenario?: string;
  readonly actions?: readonly string[];
  readonly reducedMotion?: boolean;
  readonly mode?: RunMode;
  /** `animation` by default: steps last as long as their tokens travel. */
  readonly pace?: Pace;
}

function discreteKey(state: PlayerState): string {
  return [
    state.scenarioId,
    state.stepIndex,
    state.mode,
    state.actions.join("+"),
    state.reducedMotion,
  ].join("|");
}

export function createPlayer(machine: Machine, options: PlayerOptions = {}): Player {
  const cache = new Map<string, ResolvedMachine>();
  const resolve: Resolve = (actions) => {
    const key = actionsKey(machine, actions);
    let resolved = cache.get(key);
    if (!resolved) {
      resolved = resolveMachine(machine, actions);
      cache.set(key, resolved);
    }
    return resolved;
  };

  const initialResolved = resolve(options.actions ?? []);
  let state: PlayerState = {
    scenarioId: scenarioOf(initialResolved, options.scenario ?? "").id,
    stepIndex: 0,
    ticks: 0,
    mode: options.mode ?? "paused",
    actions: initialResolved.actions,
    reducedMotion: options.reducedMotion ?? false,
    pace: options.pace ?? "animation",
  };
  let accumulator = 0;
  /** Time fed to `advance`, dropped time excluded: `Frame.clock`. */
  let clockMs = 0;
  let snapshotKey = "";
  let snapshot: PlayerSnapshot | undefined;
  const listeners = new Set<() => void>();

  const buildSnapshot = (): PlayerSnapshot => {
    const resolved = resolve(state.actions);
    const scenario = scenarioOf(resolved, state.scenarioId);
    return {
      state,
      resolved,
      scenario,
      step: stepOf(scenario, state.stepIndex),
      stepCount: scenario.steps.length,
      finished: isFinished(state, scenario),
      log: logUntil(scenario, state.stepIndex),
    };
  };

  const commit = (next: PlayerState) => {
    state = next;
    const key = discreteKey(state);
    if (key !== snapshotKey) {
      snapshotKey = key;
      snapshot = buildSnapshot();
      for (const listener of listeners) {
        listener();
      }
    }
  };

  return {
    machine,
    getSnapshot() {
      if (!snapshot || discreteKey(state) !== snapshotKey) {
        snapshotKey = discreteKey(state);
        snapshot = buildSnapshot();
      }
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(event) {
      accumulator = 0;
      commit(reduce(state, event, resolve));
    },
    advance(dtMs) {
      if (!Number.isFinite(dtMs) || dtMs <= 0) {
        return;
      }
      clockMs += Math.min(dtMs, MAX_STEPS_PER_ADVANCE * FIXED_STEP_MS);
      accumulator += dtMs;
      let steps = Math.floor(accumulator / FIXED_STEP_MS + EPSILON);
      if (steps > MAX_STEPS_PER_ADVANCE) {
        steps = MAX_STEPS_PER_ADVANCE;
        accumulator = 0;
      } else {
        accumulator = Math.max(0, accumulator - steps * FIXED_STEP_MS);
      }
      let next = state;
      for (let i = 0; i < steps; i++) {
        next = tick(next, resolve);
      }
      if (next !== state) {
        commit(next);
      }
    },
    sample() {
      const resolved = resolve(state.actions);
      const step = stepOf(scenarioOf(resolved, state.scenarioId), state.stepIndex);
      // Time only moves forward at one tick per fixed step, so the
      // accumulator remainder gives the exact sub-tick position.
      const total = ticksFor(step);
      const alpha = clamp01(accumulator / FIXED_STEP_MS);
      const ticks = state.mode === "paused" ? state.ticks : Math.min(state.ticks + alpha, total);
      const progress = state.reducedMotion ? 1 : clamp01(ticks / total);
      const eased = easeInOutCubic(progress);
      return {
        stepIndex: state.stepIndex,
        progress,
        eased,
        tokens: step.tokens.map((token) =>
          token.kind === "hold"
            ? { kind: "hold", flow: token.flow, position: token.point }
            : { kind: "travel", flow: token.flow, position: pointAlong(token.points, eased) },
        ),
        clock: clockMs / 1000,
      };
    },
    getState() {
      return state;
    },
  };
}
