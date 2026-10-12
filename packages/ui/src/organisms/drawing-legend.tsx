import { neutral } from "@nightprint/tokens";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { SectionHeading } from "../molecules/section-heading";

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LegendCallout {
  readonly key: string;
  /** The note's letter, on its tag in the margin and at the end of its leader line. */
  readonly tag: string;
  readonly term: string;
  readonly meaning: string;
  /** A sample beside the term: the flow colours, say. */
  readonly swatch?: ReactNode;
  /** The convention on the drawing, in drawing units. */
  readonly target: Point;
  /** Where the leader line ends, in the drawing's margin. */
  readonly anchor: Point;
}

export interface DrawingLegendProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  /** The drawing, filling its box: an svg in the same units as `box`. */
  readonly drawing: ReactNode;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly callouts: readonly LegendCallout[];
  /** What holds for every sheet, numbered as on a drawing. */
  readonly notes: readonly string[];
  /** Key of the callout lit on both the list and the drawing. */
  readonly active?: string | null;
  readonly onActive?: (key: string | null) => void;
}

const MONO = { fontFamily: "var(--font-mono)" };

/**
 * The conventions every machine follows, shown on a machine: one annotated drawing,
 * leader lines running from each convention to a lettered note in the margin. Pointing
 * at a note lights its line, and the other way round.
 */
export function DrawingLegend({
  eyebrow,
  title,
  lead,
  drawing,
  box,
  callouts,
  notes,
  active = null,
  onActive,
}: DrawingLegendProps) {
  return (
    <section aria-labelledby="legend-title" className="flex flex-col gap-10">
      <div className="max-w-155">
        <SectionHeading id="legend-title" eyebrow={eyebrow} title={title} lead={[lead]} />
      </div>
      <div className="border border-frame bg-bg">
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)]">
          <ol className="flex flex-col divide-y divide-line-muted border-frame max-lg:order-last max-lg:border-t lg:border-r">
            {callouts.map((callout) => {
              const lit = active === callout.key;
              return (
                <li
                  key={callout.key}
                  onMouseEnter={() => onActive?.(callout.key)}
                  onMouseLeave={() => onActive?.(null)}
                  className={cx(
                    "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3.5 px-4 py-4 transition-colors duration-200 ease-machine",
                    lit && "bg-surface",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex size-6 items-center justify-center border font-mono text-micro transition-colors duration-200",
                      lit ? "border-text bg-text text-bg" : "border-frame text-text-secondary",
                    )}
                  >
                    {callout.tag}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small font-semibold text-text">
                      {callout.term}
                      {callout.swatch}
                    </p>
                    <p className="text-small text-text-muted">{callout.meaning}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="p-3 sm:p-6">
            <div
              className="relative w-full"
              style={{ aspectRatio: `${box.width} / ${box.height}` }}
            >
              <div className="absolute inset-0">{drawing}</div>
              {/* The leader lines over the drawing: pictures of the notes listed beside it. */}
              <svg
                aria-hidden="true"
                viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
                className="absolute inset-0 size-full overflow-visible"
              >
                {callouts.map((callout) => {
                  const lit = active === callout.key;
                  const { target, anchor } = callout;
                  return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: pointing at a tag only lights its note, which the list beside it already says in words.
                    <g
                      key={callout.key}
                      onMouseEnter={() => onActive?.(callout.key)}
                      onMouseLeave={() => onActive?.(null)}
                    >
                      <line
                        x1={anchor.x}
                        y1={anchor.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={lit ? neutral.text : neutral.textFaint}
                        strokeWidth={lit ? 0.03 : 0.018}
                      />
                      <circle
                        cx={target.x}
                        cy={target.y}
                        r={lit ? 0.08 : 0.055}
                        fill={lit ? neutral.text : neutral.textFaint}
                      />
                      <rect
                        x={anchor.x - 0.22}
                        y={anchor.y - 0.22}
                        width={0.44}
                        height={0.44}
                        fill={lit ? neutral.text : neutral.bg}
                        stroke={lit ? neutral.text : neutral.frame}
                        strokeWidth={0.02}
                      />
                      <text
                        x={anchor.x}
                        y={anchor.y + 0.08}
                        fontSize={0.22}
                        textAnchor="middle"
                        fill={lit ? neutral.bg : neutral.textSecondary}
                        style={MONO}
                      >
                        {callout.tag}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
        <div className="border-t border-frame px-4 pt-4 pb-5">
          <h3 className="mono-label text-text-faint">General notes</h3>
          <ol className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {notes.map((note, index) => (
              <li
                key={note}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] font-mono text-log text-text-body"
              >
                {/* The list numbers the notes for screen readers already. */}
                <span aria-hidden="true" className="text-text-faint">
                  {index + 1}.
                </span>
                {note}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
