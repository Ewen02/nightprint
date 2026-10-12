import type { Machine } from "@nightprint/engine";
import { hexagonal } from "./mch-001-hexagonal";

/** Published machines, in catalogue order. */
export const machines: readonly Machine[] = [hexagonal];

export interface UpcomingMachine {
  readonly code: string;
  readonly title: string;
  readonly family: Machine["family"];
}

/** Shown greyed out in the catalogue. Order is indicative. */
export const upcoming: readonly UpcomingMachine[] = [
  { code: "MCH-002", title: "JavaScript event loop", family: "frontend" },
  { code: "MCH-003", title: "Domain-driven design", family: "backend" },
  { code: "MCH-004", title: "Offline-first sync", family: "mobile" },
  { code: "MCH-005", title: "CQRS and event sourcing", family: "backend" },
  { code: "MCH-006", title: "React rendering", family: "frontend" },
  { code: "MCH-007", title: "Redis cache-aside", family: "infra" },
  { code: "MCH-008", title: "Kafka partitions and consumer groups", family: "infra" },
];

export function getMachine(slug: string): Machine | undefined {
  return machines.find((m) => m.slug === slug);
}

export { hexagonal };
