import type { ReactNode } from "react";
import { cx } from "../cx";

export interface WellProps {
  readonly children: ReactNode;
  /** `ul` or `ol` when the well holds log lines. */
  readonly as?: "div" | "ul" | "ol";
  /** Layout of the content (flex, gap). */
  readonly className?: string;
}

/** The recessed `inset` area that holds a log excerpt or a sequencer. */
export function Well({ children, as: Tag = "div", className }: WellProps) {
  return <Tag className={cx("rounded-xs bg-inset p-3", className)}>{children}</Tag>;
}
