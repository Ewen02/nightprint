import type { FlowName } from "@nightprint/tokens";
import { StepDot } from "../atoms/step-dot";

export interface StepDotItem {
  readonly id: string;
  readonly title: string;
  readonly flow: FlowName;
}

export interface StepDotsProps {
  readonly steps: readonly StepDotItem[];
  /** Index of the current step. */
  readonly current: number;
  readonly onSeek?: (index: number) => void;
}

/** The step bars of the sequencer; each bar jumps to its step. */
export function StepDots({ steps, current, onSeek }: StepDotsProps) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((step, index) => (
        <li key={step.id}>
          <button
            type="button"
            aria-label={`Step ${index + 1}: ${step.title}`}
            aria-current={index === current ? "step" : undefined}
            className="flex h-8 items-center px-0.5"
            onClick={() => onSeek?.(index)}
          >
            <StepDot
              flow={step.flow}
              state={index === current ? "current" : index < current ? "done" : "upcoming"}
            />
          </button>
        </li>
      ))}
    </ol>
  );
}
