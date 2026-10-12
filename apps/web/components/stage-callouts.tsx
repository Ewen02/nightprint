import type { PlayerSnapshot } from "@nightprint/engine";
import type { StageCallout } from "@nightprint/scene";
import { dimensionLabelId, zoneLabelId } from "@nightprint/scene/label-ids";
import { DimensionLabel, PartCallout, ZoneLabel } from "@nightprint/ui";
import { partCallouts } from "./machine-view-model";

/**
 * Everything pinned on the stage: each zone's name, each drawn route's latency
 * (in the flow colour while a token travels it), then each numbered part's callout.
 */
export function stageCallouts(
  snapshot: PlayerSnapshot,
  selected: string | null = null,
  hovered: string | null = null,
): StageCallout[] {
  const zones = snapshot.resolved.machine.stage.zones.map((zone) => ({
    id: zoneLabelId(zone.id),
    content: <ZoneLabel label={zone.label} note={zone.note} />,
    keepInside: true,
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
    }));
  const parts = partCallouts(snapshot, selected, hovered).map(({ id, ...callout }) => ({
    id,
    content: <PartCallout {...callout} />,
  }));
  return [...zones, ...dimensions, ...parts];
}
