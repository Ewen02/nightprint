import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import { cx } from "../cx";

export interface StepRulerProps {
  /** The steps of the run, in order, each in the colour of its flow. */
  readonly steps: readonly { readonly key: string; readonly flow: FlowName }[];
  /** Index of the step playing; -1 before the run. */
  readonly current: number;
  readonly className?: string;
}

/**
 * The zones along a sheet's top edge, one per step of the run, ruled in the colour of
 * its flow once played. Opaque: text that scrolls under it never shows through.
 */
export function StepRuler({ steps, current, className }: StepRulerProps) {
  return (
    <ol
      aria-hidden="true"
      className={cx("grid border-b border-line-muted bg-bg", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="relative border-r border-line-muted px-2 py-1.5 font-mono text-micro last:border-r-0"
        >
          <span className={index === current ? "text-text" : "text-text-faint"}>{index + 1}</span>
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
  );
}
