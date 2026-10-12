import type { Player, PlayerSnapshot } from "@nightprint/engine";
import { useSyncExternalStore } from "react";

/** Re-renders on step, mode or action changes only, never per frame. */
export function usePlayerSnapshot(player: Player): PlayerSnapshot {
  return useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
}
