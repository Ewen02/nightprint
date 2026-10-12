import type { Machine, PlayerState } from "@nightprint/engine";

/**
 * A moment of a machine as a URL: `?scenario=reject-order&with=swap-storage&step=3`.
 * Defaults are left out, and anything the machine does not know is ignored, so an
 * old link to a changed machine still opens on something sensible.
 */
export interface MachineMoment {
  readonly scenario: string | null;
  readonly actions: readonly string[];
  /** Zero-based step index, or null for the beginning. */
  readonly step: number | null;
}

export function readMoment(search: string, machine: Machine): MachineMoment | null {
  const params = new URLSearchParams(search);
  if (!params.has("scenario") && !params.has("with") && !params.has("step")) {
    return null;
  }
  const scenarioIds = new Set(machine.scenarios.map((s) => s.id));
  const actionIds = new Set(machine.actions.map((a) => a.id));
  const scenario = params.get("scenario");
  const step = Number.parseInt(params.get("step") ?? "", 10);
  return {
    scenario: scenario && scenarioIds.has(scenario) ? scenario : null,
    actions: (params.get("with") ?? "").split(",").filter((id) => actionIds.has(id)),
    step: Number.isInteger(step) && step >= 1 ? step - 1 : null,
  };
}

export function momentLink(base: string, state: PlayerState, machine: Machine): string {
  const params = new URLSearchParams();
  if (state.scenarioId !== machine.scenarios[0]?.id) {
    params.set("scenario", state.scenarioId);
  }
  if (state.actions.length > 0) {
    params.set("with", state.actions.join(","));
  }
  params.set("step", String(state.stepIndex + 1));
  return `${base}?${params.toString().replaceAll("%2C", ",")}`;
}
