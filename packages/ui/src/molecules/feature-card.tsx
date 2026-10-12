import type { FlowName } from "@nightprint/tokens";
import type { ReactNode } from "react";
import { Balloon } from "../atoms/balloon";

export interface FeatureCardProps {
  /** Balloon number: the order in which the features are read. */
  readonly number: number;
  /** Lights the balloon, as the current step would. */
  readonly flow?: FlowName | null;
  readonly title: string;
  readonly body: string;
  /** A working sample of the feature, pinned to the bottom of the card. */
  readonly demo: ReactNode;
}

/** A numbered feature on `surface`: balloon and title, a sentence, then a live sample. */
export function FeatureCard({ number, flow = null, title, body, demo }: FeatureCardProps) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-md border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <Balloon number={number} flow={flow} />
        <h3 className="text-heading">{title}</h3>
      </div>
      <p className="text-small text-text-muted">{body}</p>
      <div className="mt-auto">{demo}</div>
    </article>
  );
}
