import type { FlowName } from "@nightprint/tokens";
import { MonoLabel } from "../atoms/mono-label";

export interface StepCaptionProps {
  /** Zero-based index of the step. */
  readonly index: number;
  readonly count: number;
  readonly title: string;
  readonly body: string;
  readonly flow: FlowName;
}

/** What the current step shows, read aloud when it changes. */
export function StepCaption({ index, count, title, body, flow }: StepCaptionProps) {
  return (
    // The live region stays put; what it holds arrives anew with each step, so screen
    // readers still hear the change and eyes see it come in instead of swap.
    <div aria-live="polite" className="flex min-w-0 flex-1 flex-col">
      <div
        key={`${index}:${title}`}
        className="flex animate-enter flex-col gap-1 motion-reduce:animate-none"
      >
        <MonoLabel flow={flow}>
          Step {index + 1} / {count}
        </MonoLabel>
        <p className="text-heading">{title}</p>
        <p className="text-small text-text-muted">{body}</p>
      </div>
    </div>
  );
}
