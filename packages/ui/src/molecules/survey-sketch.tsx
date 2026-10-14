import { flow, neutral } from "@nightprint/tokens";

/** A unit of the repository, placed on the sketch. */
export interface SketchBox {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  /** The part the drafter put it in, written in its place once named. */
  readonly part?: string | undefined;
  /**
   * `found`: surveyed; `grouped`: the drafter put it in a part; `latest`: in the part it
   * just wrote; `dropped`: left out of the machine, fading as the parts close in.
   */
  readonly state: "found" | "grouped" | "latest" | "dropped";
  /** Where it moves when the parts close in: its part's centre. */
  readonly to?: { readonly x: number; readonly y: number } | undefined;
  /** When it appears, in ms after the sketch starts drawing. */
  readonly delay: number;
}

/** An import between two units: `d` is an SVG path in sketch units. */
export interface SketchLine {
  readonly id: string;
  readonly d: string;
  /** `grouped` once both its ends are in parts. */
  readonly state: "found" | "grouped";
  readonly delay: number;
}

export interface SurveySketchProps {
  readonly width: number;
  readonly height: number;
  readonly boxes: readonly SketchBox[];
  readonly lines: readonly SketchLine[];
  /** A survey line crosses the plate while the drafter works. */
  readonly sweeping: boolean;
  /** The parts close in: each unit moves to its part, the rest fade. */
  readonly closing: boolean;
  /** What the sketch shows, for whoever cannot see it. */
  readonly label: string;
}

const FILL: Record<SketchBox["state"], string> = {
  found: neutral.plate,
  grouped: neutral.raised,
  latest: neutral.raised,
  dropped: neutral.plate,
};
const STROKE: Record<SketchBox["state"], string> = {
  found: neutral.frame,
  grouped: flow.request,
  latest: flow.write,
  dropped: neutral.lineStrong,
};

/**
 * A repository surveyed as a pencil sketch: a box per unit, a line per import, drawn as they
 * are found; then each unit takes the name of the part the drafter puts it in, and the
 * units close in on their parts.
 */
export function SurveySketch({
  width,
  height,
  boxes,
  lines,
  sweeping,
  closing,
  label,
}: SurveySketchProps) {
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-plate">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="block h-auto w-full"
      >
        {lines.map((line) => (
          <path
            key={line.id}
            d={line.d}
            fill="none"
            stroke={line.state === "grouped" ? flow.request : neutral.textFaint}
            strokeOpacity={closing ? 0 : line.state === "grouped" ? 0.7 : 0.55}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            className="animate-draw transition-[stroke-opacity] duration-700 motion-reduce:animate-none"
            style={{ animationDelay: `${line.delay}ms` }}
          />
        ))}
        {boxes.map((box) => {
          const dx = closing && box.to ? box.to.x - (box.x + box.width / 2) : 0;
          const dy = closing && box.to ? box.to.y - (box.y + box.height / 2) : 0;
          return (
            <g
              key={box.id}
              className="transition-[transform,opacity] duration-700 ease-machine motion-reduce:transition-none"
              style={{
                transform: `translate(${dx}px, ${dy}px)`,
                opacity: closing && box.state === "dropped" ? 0 : 1,
              }}
            >
              <g
                className="animate-enter motion-reduce:animate-none"
                style={{ animationDelay: `${box.delay}ms` }}
              >
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  rx={2}
                  fill={FILL[box.state]}
                  stroke={STROKE[box.state]}
                  strokeWidth={1}
                  className="transition-[fill,stroke] duration-500"
                />
                <title>{box.label}</title>
                <text
                  x={box.x + 10}
                  y={box.y + box.height / 2}
                  dominantBaseline="central"
                  className={box.part ? "font-mono uppercase" : "font-mono"}
                  fontSize={box.part ? 10 : 11}
                  letterSpacing={box.part ? "0.08em" : undefined}
                  fill={
                    box.part
                      ? box.state === "latest"
                        ? flow.write
                        : flow.request
                      : neutral.textSecondary
                  }
                >
                  {box.part ?? box.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      {sweeping && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-sweep motion-reduce:hidden"
        >
          <div className="h-full w-px" style={{ background: flow.request, opacity: 0.35 }} />
        </div>
      )}
    </div>
  );
}
