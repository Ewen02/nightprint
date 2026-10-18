import { type FlowName, flow as flowColour } from "@nightprint/tokens";

export interface SequenceMessage {
  /** The side that sends it. */
  readonly from: "left" | "right";
  /** When it leaves and when it arrives, in ms from the first message. */
  readonly start: number;
  readonly end: number;
  /** What it carries, as its token reads: "CH". */
  readonly label?: string | undefined;
  readonly flow: FlowName;
}

export interface SequenceMark {
  readonly side: "left" | "right";
  /** When, in ms. */
  readonly at: number;
  readonly label?: string | undefined;
  readonly flow: FlowName;
}

export interface SequenceChartProps {
  /** The two parties, left then right: "Browser", "Web server". */
  readonly parties: readonly [string, string];
  /** The messages sent so far. */
  readonly messages: readonly SequenceMessage[];
  /** What a party did on its own: a check, an alert. */
  readonly marks: readonly SequenceMark[];
  /** The run's whole length, in ms: the axis keeps it, so it does not rescale as it fills. */
  readonly span: number;
  /** A rule every round trip, in ms. */
  readonly tick: number;
}

const WIDTH = 360;
const LEFT_X = 92;
const RIGHT_X = 316;
const TOP = 30;
const BOTTOM = 14;
const PER_MS = 1.05;

/**
 * A protocol as a timing diagram, pinned beside its drawing: the two parties as columns,
 * time running down, each message a slanted arrow from the time it leaves to the time it
 * arrives, and a rule at every round trip. A handshake's cost reads as its length. Given
 * less height than it needs, it scales down rather than run under what is below it.
 */
export function SequenceChart({ parties, messages, marks, span, tick }: SequenceChartProps) {
  const height = TOP + span * PER_MS + BOTTOM;
  const y = (ms: number) => TOP + ms * PER_MS;
  const side = (s: "left" | "right") => (s === "left" ? LEFT_X : RIGHT_X);
  const ticks = Array.from({ length: Math.floor(span / tick) }, (_, i) => (i + 1) * tick);
  const [left, right] = parties;

  return (
    <section
      aria-label="Timing"
      className="flex min-h-0 w-[24rem] max-w-full flex-col overflow-hidden rounded-xs border border-line bg-bg/90"
    >
      <p className="mono-label flex-none border-b border-line-muted px-3 py-1.5 text-text-secondary">
        Timing · {tick} ms a round trip
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        aria-hidden="true"
        fontSize={9}
        // No taller than the room above the title block: a long handshake scales down.
        className="max-h-64 min-h-0 w-full flex-1 font-mono"
      >
        <text x={LEFT_X} y={14} textAnchor="middle" className="fill-text-secondary">
          {left}
        </text>
        <text x={RIGHT_X} y={14} textAnchor="middle" className="fill-text-secondary">
          {right}
        </text>
        {ticks.map((ms) => (
          <g key={ms}>
            <line
              x1={LEFT_X - 8}
              x2={RIGHT_X + 8}
              y1={y(ms)}
              y2={y(ms)}
              className="stroke-line-muted"
              strokeDasharray="2 3"
            />
            <text x={LEFT_X - 14} y={y(ms) + 3} textAnchor="end" className="fill-text-faint">
              {ms} ms
            </text>
          </g>
        ))}
        <line x1={LEFT_X} x2={LEFT_X} y1={TOP - 6} y2={height - BOTTOM} className="stroke-frame" />
        <line
          x1={RIGHT_X}
          x2={RIGHT_X}
          y1={TOP - 6}
          y2={height - BOTTOM}
          className="stroke-frame"
        />
        {messages.map((message, index) => {
          const x1 = side(message.from);
          const x2 = side(message.from === "left" ? "right" : "left");
          const y1 = y(message.start);
          const y2 = y(message.end);
          const colour = flowColour[message.flow];
          const dir = x2 > x1 ? -1 : 1;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: messages only ever append.
            <g key={index}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.5} style={{ stroke: colour }} />
              <polygon
                points={`${x2},${y2} ${x2 + dir * 7},${y2 - 4} ${x2 + dir * 7},${y2 + 3}`}
                style={{ fill: colour }}
              />
              {message.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  style={{ fill: colour }}
                >
                  {message.label}
                </text>
              )}
            </g>
          );
        })}
        {marks.map((mark, index) => {
          const cx = side(mark.side);
          const colour = flowColour[mark.flow];
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: marks only ever append.
            <g key={`mark-${index}`}>
              <circle cx={cx} cy={y(mark.at)} r={3.5} style={{ fill: colour }} />
              {mark.label && (
                <text
                  // Inside, between the columns: the round-trip rules are labelled outside.
                  x={mark.side === "left" ? cx + 8 : cx - 8}
                  y={y(mark.at) + 3}
                  textAnchor={mark.side === "left" ? "start" : "end"}
                  style={{ fill: colour }}
                >
                  {mark.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* The diagram, as a list for whoever does not see it. */}
      <ol className="sr-only">
        {messages.map((message, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: messages only ever append.
          <li key={index}>
            {`${message.from === "left" ? left : right} to ${message.from === "left" ? right : left}${message.label ? `, ${message.label}` : ""}: ${message.start} to ${message.end} ms`}
          </li>
        ))}
      </ol>
    </section>
  );
}
