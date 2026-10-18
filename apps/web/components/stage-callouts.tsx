import type { PlayerSnapshot } from "@nightprint/engine";
import type { StageCallout } from "@nightprint/scene";
import { dimensionLabelId, tokenLabelId, zoneLabelId } from "@nightprint/scene/label-ids";
import { DimensionLabel, PartCallout, TokenTag, ZoneLabel } from "@nightprint/ui";
import { partCallouts } from "./machine-view-model";

/**
 * Everything pinned on the stage: each zone's name, each drawn route's latency
 * (in the flow colour while a token travels it), each numbered part's callout, then
 * the name of every token the step moves that has one.
 */
export function stageCallouts(
  snapshot: PlayerSnapshot,
  selected: string | null = null,
  hovered: string | null = null,
  /** Parts of the step named at once: fewer on a narrow stage, where names collide. */
  namedPerStep = 2,
): StageCallout[] {
  const { zones: regions, view } = snapshot.resolved.machine.stage;
  const zones = regions.map((zone) => ({
    id: zoneLabelId(zone.id),
    // Seen from the front, the zones are a bench's lanes, named large.
    content: (
      <ZoneLabel label={zone.label} note={zone.note} variant={view === "front" ? "lane" : "zone"} />
    ),
    keepInside: true,
    // A zone's name is read once; a part's name is what the step is about.
    yields: true,
  }));
  const travelled = new Map(
    (snapshot.finished ? [] : snapshot.step.tokens).flatMap((token) =>
      token.kind === "travel" ? token.routes.map((id) => [id, token.flow] as const) : [],
    ),
  );
  const dimensions = snapshot.resolved.routes
    .filter((route) => route.kind === "pipe" && route.latencyMs > 0)
    .map((route) => ({
      id: dimensionLabelId(route.id),
      content: (
        <DimensionLabel value={`${route.latencyMs} ms`} flow={travelled.get(route.id) ?? null} />
      ),
      // The least needed label: it gives way to a part's name or a zone's.
      yields: true,
    }));
  const parts = partCallouts(snapshot, selected, hovered, namedPerStep).map(
    ({ id, ...callout }) => ({
      id,
      content: <PartCallout {...callout} />,
      raised: callout.detail !== "number",
    }),
  );
  // A token's slot is its place in the step's list: the scene keeps one anchor per slot.
  const tokens = (snapshot.finished ? [] : snapshot.step.tokens).flatMap((token, index) =>
    token.label
      ? [{ id: tokenLabelId(index), content: <TokenTag label={token.label} flow={token.flow} /> }]
      : [],
  );
  return [...zones, ...dimensions, ...parts, ...tokens];
}
