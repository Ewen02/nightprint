import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import type { ReactNode } from "react";
import { cx } from "../cx";

const tones = {
  text: "text-text",
  secondary: "text-text-secondary",
  faint: "text-text-faint",
} as const;

export interface MonoLabelProps {
  readonly children: ReactNode;
  readonly as?: "p" | "span" | "h2" | "h3";
  readonly id?: string;
  /** Neutral tone; ignored when `flow` is set. */
  readonly tone?: keyof typeof tones;
  /** Colours the label with a flow, e.g. the current step number. */
  readonly flow?: FlowName;
  readonly className?: string;
}

/** Plex Mono capitals, +0.14 em: section titles, step numbers, breadcrumbs. */
export function MonoLabel({
  children,
  as: Tag = "p",
  id,
  tone = "secondary",
  flow,
  className,
}: MonoLabelProps) {
  return (
    <Tag
      id={id}
      className={cx("mono-label", !flow && tones[tone], className)}
      style={flow ? { color: flowColour[flow] } : undefined}
    >
      {children}
    </Tag>
  );
}
