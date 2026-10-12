import { getMachine } from "@nightprint/catalog";
import type { Machine } from "@nightprint/engine";

/**
 * The published machine with this slug. Islands take a slug rather than the
 * machine, so the page does not serialise the whole definition into its payload.
 */
export function machineBySlug(slug: string): Machine {
  const machine = getMachine(slug);
  if (!machine) {
    throw new Error(`Unknown machine "${slug}"`);
  }
  return machine;
}
