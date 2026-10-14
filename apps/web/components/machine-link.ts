import type { Machine, Player, PlayerState } from "@nightprint/engine";

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

/** The query that opens a moment, defaults left out. `step` is zero-based. */
export function momentQuery(
  machine: Machine,
  moment: { readonly scenario: string; readonly actions: readonly string[]; readonly step: number },
): string {
  const params = new URLSearchParams();
  if (moment.scenario !== machine.scenarios[0]?.id) {
    params.set("scenario", moment.scenario);
  }
  if (moment.actions.length > 0) {
    params.set("with", moment.actions.join(","));
  }
  params.set("step", String(moment.step + 1));
  return `?${params.toString().replaceAll("%2C", ",")}`;
}

/**
 * The page's address on a moment. Whatever else its query says stays: the import page's
 * `?repo=…&sha=…` names the machine itself.
 */
export function momentLink(page: string, state: PlayerState, machine: Machine): string {
  const url = new URL(page);
  url.hash = "";
  for (const key of ["scenario", "with", "step"]) {
    url.searchParams.delete(key);
  }
  const moment = momentQuery(machine, {
    scenario: state.scenarioId,
    actions: state.actions,
    step: state.stepIndex,
  });
  for (const [key, value] of new URLSearchParams(moment)) {
    url.searchParams.set(key, value);
  }
  return url.toString().replaceAll("%2C", ",");
}

/** Puts the player on a moment: its scenario, exactly its switches, its step. */
export function goToMoment(player: Player, moment: MachineMoment) {
  const scenario = moment.scenario ?? player.machine.scenarios[0]?.id;
  if (scenario && scenario !== player.getState().scenarioId) {
    // Choosing a scenario plays it: hold it until the switches and the step are set.
    player.dispatch({ type: "setScenario", scenario });
    player.dispatch({ type: "pause" });
  }
  for (const action of player.machine.actions) {
    const active = moment.actions.includes(action.id);
    if (player.getState().actions.includes(action.id) !== active) {
      player.dispatch({ type: "setAction", action: action.id, active });
    }
  }
  player.dispatch({ type: "seek", step: moment.step ?? 0 });
}
