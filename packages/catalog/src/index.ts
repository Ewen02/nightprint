import type { Machine } from "@nightprint/engine";
import { hexagonal } from "./mch-001-hexagonal";
import { eventLoop } from "./mch-002-event-loop";
import { cacheAside } from "./mch-003-cache-aside";
import { nightprint } from "./prj-001-nightprint";

/** Published machines, in catalogue order. */
export const machines: readonly Machine[] = [hexagonal, eventLoop, cacheAside];

/** Real projects drawn from their repositories (PRJ), apart from the concept series. */
export const projects: readonly Machine[] = [nightprint];

export interface UpcomingMachine {
  readonly code: string;
  readonly title: string;
  readonly family: Machine["family"];
}

/** Shown greyed out in the catalogue. Order is indicative. */
export const upcoming: readonly UpcomingMachine[] = [
  { code: "MCH-004", title: "Domain-driven design", family: "backend" },
  { code: "MCH-005", title: "Offline-first sync", family: "mobile" },
  { code: "MCH-006", title: "CQRS and event sourcing", family: "backend" },
  { code: "MCH-007", title: "React rendering", family: "frontend" },
  { code: "MCH-008", title: "Kafka partitions and consumer groups", family: "infra" },
];

export function getMachine(slug: string): Machine | undefined {
  return [...machines, ...projects].find((m) => m.slug === slug);
}

export { cacheAside, eventLoop, hexagonal, nightprint };
