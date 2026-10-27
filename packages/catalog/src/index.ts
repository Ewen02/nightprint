import type { Machine } from "@nightprint/engine";
import { ragCagKag } from "./ben-001-rag-cag-kag";
import { retryStorm } from "./fmd-001-retry-storm";
import { hexagonal } from "./mch-001-hexagonal";
import { eventLoop } from "./mch-002-event-loop";
import { cacheAside } from "./mch-003-cache-aside";
import { ddd } from "./mch-004-ddd";
import { offlineFirst } from "./mch-005-offline-first";
import { nightprint } from "./prj-001-nightprint";
import { tlsHandshake } from "./prt-001-tls-handshake";

/** Published machines, in catalogue order. */
export const machines: readonly Machine[] = [
  hexagonal,
  eventLoop,
  cacheAside,
  ddd,
  offlineFirst,
  ragCagKag,
  retryStorm,
  tlsHandshake,
];

/** Real projects drawn from their repositories (PRJ), apart from the concept series. */
export const projects: readonly Machine[] = [nightprint];

export interface UpcomingMachine {
  readonly code: string;
  readonly title: string;
  readonly family: Machine["family"];
}

/** Shown greyed out in the catalogue. Order is indicative. */
export const upcoming: readonly UpcomingMachine[] = [
  { code: "MCH-006", title: "CQRS and event sourcing", family: "backend" },
  { code: "MCH-007", title: "React rendering", family: "frontend" },
  { code: "MCH-008", title: "Kafka partitions and consumer groups", family: "infra" },
];

export function getMachine(slug: string): Machine | undefined {
  return [...machines, ...projects].find((m) => m.slug === slug);
}

export {
  cacheAside,
  ddd,
  eventLoop,
  hexagonal,
  nightprint,
  offlineFirst,
  ragCagKag,
  retryStorm,
  tlsHandshake,
};
