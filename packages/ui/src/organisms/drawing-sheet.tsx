import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import type { ReactNode } from "react";

export interface DrawingSheetProps {
  /** The 3D stage. It fills the sheet. */
  readonly stage: ReactNode;
  /** The steps of the run, in order, each in the colour of its flow. */
  readonly steps: readonly { readonly key: string; readonly flow: FlowName }[];
  /** Index of the step playing; -1 before the run. */
  readonly current: number;
  /** Bottom right, from wide screens up. */
  readonly cartouche?: ReactNode;
}

/**
 * A whole drawing sheet around a running machine: its frame, and along the top edge,
 * where a sheet numbers its zones, one zone per step of the run, ruled in the colour
 * of its flow once played. The stage brings the machine; the sheet only frames it.
 */
export function DrawingSheet({ stage, steps, current, cartouche }: DrawingSheetProps) {
  return (
    <div className="relative size-full bg-bg">
      <div className="absolute inset-0">{stage}</div>
      {/* Over the stage, and transparent to drags: the frame is drawn, not touched. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 border border-line-strong sm:inset-3"
      >
        <ol
          className="grid border-b border-line-muted bg-bg/80"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, index) => (
            <li
              key={step.key}
              className="relative border-r border-line-muted px-2 py-1.5 font-mono text-micro last:border-r-0"
            >
              <span className={index === current ? "text-text" : "text-text-faint"}>
                {index + 1}
              </span>
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left transition-[transform,opacity] duration-500 ease-machine motion-reduce:transition-none"
                style={{
                  background: flowColour[step.flow],
                  transform: `scaleX(${index <= current ? 1 : 0})`,
                  opacity: index < current ? 0.45 : 1,
                }}
              />
            </li>
          ))}
        </ol>
      </div>
      {cartouche && (
        <div className="absolute right-6 bottom-6 z-10 hidden lg:block">{cartouche}</div>
      )}
    </div>
  );
}
