import type { FlowName } from "@nightprint/tokens";
import { useState } from "react";
import { MonoLabel } from "../atoms/mono-label";

export interface StepCaptionProps {
  /** Zero-based index of the step. */
  readonly index: number;
  readonly count: number;
  readonly title: string;
  readonly body: string;
  /** The step in one sentence, shown first; the body waits a click. */
  readonly lead?: string | undefined;
  readonly flow: FlowName;
}

/**
 * What the current step shows, read aloud when it changes. A step with a lead shows that one
 * sentence, and its body on demand: once asked for, the detail stays open from step to step.
 */
export function StepCaption({ index, count, title, body, lead, flow }: StepCaptionProps) {
  const [detail, setDetail] = useState(false);
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
        {lead ? (
          <>
            <p className="text-body text-text-body">{lead}</p>
            {detail && <p className="text-small text-text-muted">{body}</p>}
            <button
              type="button"
              aria-expanded={detail}
              onClick={() => setDetail(!detail)}
              className="mono-label self-start text-text-secondary underline decoration-frame underline-offset-4 transition-colors hover:text-text"
            >
              {detail ? "Less" : "More"}
            </button>
          </>
        ) : (
          <p className="text-small text-text-muted">{body}</p>
        )}
      </div>
    </div>
  );
}
