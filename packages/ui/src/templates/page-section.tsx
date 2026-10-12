import type { ReactNode } from "react";
import { cx } from "../cx";

export interface PageSectionProps {
  /** Anchor for links to the section. */
  readonly id: string;
  /** `surface` sets a section apart from its neighbours. */
  readonly tone?: "base" | "surface";
  /** `rise`: the content rises into place as it scrolls into view. */
  readonly entrance?: "none" | "rise";
  readonly children: ReactNode;
}

/** A full-width band of a page, ruled on top, with its content centred. Every page uses it. */
export function PageSection({ id, tone = "base", entrance = "none", children }: PageSectionProps) {
  return (
    <div id={id} className={cx("border-t border-line-muted", tone === "surface" && "bg-surface")}>
      <div className={cx("mx-auto max-w-300 px-4 py-22 sm:px-6", entrance === "rise" && "reveal")}>
        {children}
      </div>
    </div>
  );
}
