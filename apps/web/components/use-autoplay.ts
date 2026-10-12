"use client";

import type { Player } from "@nightprint/engine";
import { useEffect } from "react";
import { prefersReducedMotion } from "./use-reduced-motion";

/**
 * Plays the scenario once on arrival, unless the visitor asked for reduced
 * motion. After mount only, so the server renders the paused state and the
 * first client render matches it.
 */
export function useAutoplay(player: Player) {
  useEffect(() => {
    if (!prefersReducedMotion()) {
      player.dispatch({ type: "play" });
    }
  }, [player]);
}
