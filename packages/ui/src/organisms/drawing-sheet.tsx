import type { ReactNode } from "react";

export interface DrawingSheetProps {
  /** The 3D stage. It fills the sheet. */
  readonly stage: ReactNode;
  /** Along the top edge, inside the frame: the zones of the run (a `StepRuler`). */
  readonly ruler?: ReactNode;
  /** Bottom right, from wide screens up. */
  readonly cartouche?: ReactNode;
}

/**
 * A whole drawing sheet around a running machine: its frame, what runs along its top
 * edge, and its title block. The stage brings the machine; the sheet only frames it.
 */
export function DrawingSheet({ stage, ruler, cartouche }: DrawingSheetProps) {
  return (
    <div className="relative size-full bg-bg">
      <div className="absolute inset-0">{stage}</div>
      {/* Over the stage, and transparent to drags: the frame is drawn, not touched. */}
      <div className="pointer-events-none absolute inset-2 border border-line-strong sm:inset-3">
        {ruler}
      </div>
      {cartouche && (
        <div className="absolute right-6 bottom-6 z-10 hidden lg:block">{cartouche}</div>
      )}
    </div>
  );
}
