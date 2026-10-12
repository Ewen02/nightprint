/**
 * Ids of the anchors the page pins callouts to. Parts use their own id; a zone's
 * is prefixed so it never collides with a part's. Kept free of three, so the page
 * can import it without loading the scene.
 */
export function zoneLabelId(zoneId: string): string {
  return `zone:${zoneId}`;
}

/** A route's latency dimension. */
export function dimensionLabelId(routeId: string): string {
  return `dim:${routeId}`;
}
