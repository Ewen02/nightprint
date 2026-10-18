import { type FlowName, flow as flowColour } from "@nightprint/tokens";

export interface MeterPoint {
  readonly value: number;
  /** The step's flow: the colour of the line that reaches this point. */
  readonly flow: FlowName;
}

export interface MeterChartProps {
  /** "Load on the database". */
  readonly label: string;
  /** "queries/s". */
  readonly unit: string;
  /** The limit the meter is read against, drawn as a dashed line. */
  readonly capacity: number;
  /** One point per step reached so far, in order. */
  readonly points: readonly MeterPoint[];
  /** How many steps the run has: the width the chart keeps, so it does not stretch as it fills. */
  readonly steps: number;
}

const WIDTH = 360;
const HEIGHT = 150;
const LEFT = 44;
const RIGHT = 16;
const TOP = 22;
const BOTTOM = 26;

const number = new Intl.NumberFormat("en-US");

/**
 * A meter read step by step against its limit, as a strip chart pinned beside the drawing:
 * a failure mode's load climbing past capacity, and whether it comes back down. The axis
 * stops at twice the capacity; a value beyond it is drawn against the top, its number beside.
 */
export function MeterChart({ label, unit, capacity, points, steps }: MeterChartProps) {
  const top = capacity * 2;
  const x = (index: number) =>
    LEFT + (steps <= 1 ? 0 : (index / (steps - 1)) * (WIDTH - LEFT - RIGHT));
  const y = (value: number) => TOP + (1 - Math.min(value, top) / top) * (HEIGHT - TOP - BOTTOM);
  const summary = `${label}, in ${unit}, step by step: ${points
    .map((p) => number.format(p.value))
    .join(", ")}. Capacity ${number.format(capacity)}.`;

  return (
    <section
      aria-label={label}
      className="flex min-h-0 w-[24rem] max-w-full flex-col overflow-hidden rounded-xs border border-line bg-bg/90"
    >
      <p className="mono-label flex-none border-b border-line-muted px-3 py-1.5 text-text-secondary">
        {label} · {unit}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={summary}
        fontSize={9}
        className="min-h-0 w-full flex-1 font-mono"
      >
        {/* The capacity, the line the run must stay under. */}
        <line
          x1={LEFT}
          x2={WIDTH - RIGHT}
          y1={y(capacity)}
          y2={y(capacity)}
          className="stroke-frame"
          strokeDasharray="4 3"
        />
        <text x={LEFT - 6} y={y(capacity) + 3} textAnchor="end" className="fill-text-faint">
          {number.format(capacity)}
        </text>
        <text x={LEFT - 6} y={y(0) + 3} textAnchor="end" className="fill-text-faint">
          0
        </text>
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(0)} y2={y(0)} className="stroke-line" />
        {Array.from({ length: steps }, (_, index) => (
          <text
            // biome-ignore lint/suspicious/noArrayIndexKey: one tick per step, in order.
            key={index}
            x={x(index)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-text-faint"
          >
            {index + 1}
          </text>
        ))}
        {points.map((point, index) => {
          const previous = points[index - 1];
          const over = point.value > top;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: one point per step, in order.
            <g key={index}>
              {previous && (
                <line
                  x1={x(index - 1)}
                  y1={y(previous.value)}
                  x2={x(index)}
                  y2={y(point.value)}
                  strokeWidth={2}
                  style={{ stroke: flowColour[point.flow] }}
                />
              )}
              <circle
                cx={x(index)}
                cy={y(point.value)}
                r={index === points.length - 1 ? 3.5 : 2.25}
                style={{ fill: flowColour[point.flow] }}
              />
              {over && (index === 0 || (previous?.value ?? 0) <= top) && (
                <text
                  x={x(index) + 5}
                  y={y(point.value) - 6}
                  style={{ fill: flowColour[point.flow] }}
                >
                  {number.format(point.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </section>
  );
}
