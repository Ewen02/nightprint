"use client";

import type { Player } from "@nightprint/engine";
import { useEffect } from "react";
import { readMoment } from "./machine-link";
import { prefersReducedMotion } from "./use-reduced-motion";

/**
 * How the machine page opens. A link to a moment sets its scenario and switches
 * and plays that step once; otherwise the scenario plays from the start, unless
 * the visitor asked for reduced motion. After mount, so the server renders the
 * paused first step and the first client render matches it.
 */
export function useOpeningMoment(player: Player) {
  useEffect(() => {
    const moment = readMoment(window.location.search, player.machine);
    if (!moment) {
      if (!prefersReducedMotion()) {
        player.dispatch({ type: "play" });
      }
      return;
    }
    if (moment.scenario) {
      player.dispatch({ type: "setScenario", scenario: moment.scenario });
      player.dispatch({ type: "pause" });
    }
    for (const action of moment.actions) {
      player.dispatch({ type: "setAction", action, active: true });
    }
    player.dispatch({ type: "seek", step: moment.step ?? 0 });
  }, [player]);
}
