import type { ReactNode } from "react";

const ZONES = [1, 2, 3, 4] as const;

export interface MachineFigureProps {
  /** The 3D stage. It fills its box. */
  readonly stage: ReactNode;
  /**
   * Inset bottom left of the stage, hidden on phones: under the plate's front
   * edge, the empty corner of an isometric overview. Pair it with a camera that
   * keeps the overview, or the plate drifts under it.
   */
  readonly cartouche?: ReactNode;
  readonly transport: ReactNode;
}

/**
 * A machine framed as a drawing sheet, no data: zone numbers along the top
 * edge, the stage, then the transport. For a machine shown inside another page.
 */
export function MachineFigure({ stage, cartouche, transport }: MachineFigureProps) {
  return (
    <figure className="overflow-hidden rounded-md border border-line-strong bg-bg">
      <div
        aria-hidden="true"
        className="grid grid-cols-4 border-b border-line-muted font-mono text-micro text-text-faint"
      >
        {ZONES.map((zone) => (
          <span key={zone} className="border-r border-line-muted px-2.5 py-1 last:border-r-0">
            {zone}
          </span>
        ))}
      </div>
      <div className="relative aspect-[42/25] min-h-60">
        <div className="absolute inset-0">{stage}</div>
        {cartouche && (
          <div className="absolute bottom-4 left-4 z-10 hidden sm:block">{cartouche}</div>
        )}
      </div>
      {/* The figure's border closes the transport: hide its own bottom rule under it. */}
      <div className="-mb-px">{transport}</div>
    </figure>
  );
}
