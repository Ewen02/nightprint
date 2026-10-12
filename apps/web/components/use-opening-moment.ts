"use client";

import type { Player } from "@nightprint/engine";
import { useEffect } from "react";
import { goToMoment, readMoment } from "./machine-link";
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
    goToMoment(player, moment);
  }, [player]);
}
