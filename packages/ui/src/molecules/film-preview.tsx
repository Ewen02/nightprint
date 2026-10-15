import { flow } from "@nightprint/tokens";
import type { ReactNode } from "react";
import { cx } from "../cx";

export type FilmPreviewState =
  | {
      readonly kind: "filming";
      /** 0 to 100. */
      readonly percent: number;
      /** Where the film is: "STEP 3 / 8", or null while the machine is set down. */
      readonly step: string | null;
    }
  | {
      readonly kind: "saved";
      /** "prj-000-floriaaan-goodfood.mp4". */
      readonly file: string;
    };

export interface FilmPreviewProps {
  readonly state: FilmPreviewState;
  /** The frame being shot, 16:9, as the page draws it. */
  readonly frame: ReactNode;
}

/**
 * The video being made, in a corner of the stage like a drawing's title block: the frame
 * the film is on, where it stands, and a rule filling as it goes. Once saved, the file's name.
 */
export function FilmPreview({ state, frame }: FilmPreviewProps) {
  const filming = state.kind === "filming";
  const percent = filming ? Math.round(Math.min(100, Math.max(0, state.percent))) : 100;
  return (
    <div className="w-64 border border-frame bg-bg/85 font-mono text-micro tracking-[0.08em] text-text-body">
      <div
        aria-hidden="true"
        className="aspect-video w-full overflow-hidden border-b border-frame bg-bg"
      >
        {frame}
      </div>
      <div className="flex items-baseline justify-between gap-3 px-2.5 py-1.5">
        <span className={cx(filming ? "text-flow-request" : "text-flow-write")}>
          {filming ? "FILMING" : "SAVED"}
        </span>
        <span className="min-w-0 truncate text-right">
          {filming ? [state.step, `${percent} %`].filter(Boolean).join(" · ") : state.file}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Filming the video"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-0.5 w-full bg-line-strong"
      >
        <div
          className="h-full origin-left transition-transform duration-200 ease-machine motion-reduce:transition-none"
          style={{
            transform: `scaleX(${percent / 100})`,
            background: filming ? flow.request : flow.write,
          }}
        />
      </div>
    </div>
  );
}
