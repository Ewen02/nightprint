"use client";

import type { Player } from "@nightprint/engine";
import { useEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Whether the visitor asked for reduced motion. False on the server. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

/** Keeps the player's reduced-motion setting in step with the system preference. */
export function useReducedMotion(player: Player) {
  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const apply = () => player.dispatch({ type: "setReducedMotion", value: query.matches });
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [player]);
}
