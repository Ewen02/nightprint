"use client";

import type { Player } from "@nightprint/engine";
import { useEffect } from "react";
import { goToMoment, readMoment } from "./machine-link";
import { prefersReducedMotion } from "./use-reduced-motion";

/**
 * A link on the page to one of its own moments (the run's "Play from here") plays it
 * on the stage instead of loading the page again: the moment's scenario, switches and
 * step, then up to the stage. Without script the link still opens the moment.
 */
export function useMomentLinks(player: Player) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
        return;
      }
      const moment = readMoment(url.search, player.machine);
      if (!moment) {
        return;
      }
      event.preventDefault();
      goToMoment(player, moment);
      player.dispatch({ type: "play" });
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [player]);
}
