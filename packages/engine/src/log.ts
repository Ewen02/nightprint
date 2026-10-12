import type { ResolvedScenario } from "./resolve";
import type { Flow } from "./schema";

export const flowTags: Record<Flow, string> = {
  request: "REQ",
  write: "WRITE",
  response: "RESP",
  error: "ERR",
};

export interface LogEntry {
  readonly key: string;
  readonly stepIndex: number;
  readonly flow: Flow;
  readonly tag: string;
  readonly text: string;
  /** Simulated time at the end of the step, from route latencies. */
  readonly atMs: number;
}

/** The log as it reads once `stepIndex` has been reached. */
export function logUntil(scenario: ResolvedScenario, stepIndex: number): LogEntry[] {
  const entries: LogEntry[] = [];
  let clock = 0;
  for (const resolved of scenario.steps.slice(0, stepIndex + 1)) {
    clock += resolved.latencyMs;
    resolved.step.log.forEach((line, i) => {
      entries.push({
        key: `${resolved.step.id}-${i}`,
        stepIndex: resolved.index,
        flow: line.flow,
        tag: line.tag ?? flowTags[line.flow],
        text: line.text,
        atMs: clock,
      });
    });
  }
  return entries;
}
