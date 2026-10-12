import type { Part } from "@nightprint/engine";
import { scene } from "./palette";

/**
 * Where the first display of a machine stands. `compiling`: drawn whole but not shown
 * yet, so every material compiles before anything moves. Then the parts are set down,
 * the routes appear, the labels, and the scenario runs: `done`.
 */
export type AssemblyPhase = "compiling" | "parts" | "routes" | "labels" | "done";

export interface AssemblyTimeline {
  /** When each part starts to be set down, by part id, in seconds from the reveal. */
  readonly partAt: ReadonlyMap<string, number>;
  readonly routes: number;
  readonly labels: number;
  readonly run: number;
}

/**
 * The order of assembly: what carries no number first (the application's boundary,
 * the frame the rest sits in), then the parts by balloon number, as on the bill of parts.
 */
export function assemblyTimeline(parts: readonly Part[]): AssemblyTimeline {
  const { first, stagger, part, routes, labels, run } = scene.assembly;
  const ordered = [...parts].sort((a, b) => (a.ref ?? 0) - (b.ref ?? 0));
  const partAt = new Map(ordered.map((p, index) => [p.id, first + index * stagger]));
  const lastSet = first + (ordered.length - 1) * stagger + part * 0.5;
  return {
    partAt,
    routes: lastSet + routes,
    labels: lastSet + routes + labels,
    run: lastSet + routes + labels + run,
  };
}

/** Where a timeline puts the assembly at `t` seconds from the reveal. */
export function assemblyPhase(t: number, timeline: AssemblyTimeline): AssemblyPhase {
  if (t < 0) {
    return "compiling";
  }
  if (t < timeline.routes) {
    return "parts";
  }
  if (t < timeline.labels) {
    return "routes";
  }
  return t < timeline.run ? "labels" : "done";
}
