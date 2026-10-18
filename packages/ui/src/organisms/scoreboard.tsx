import type { FlowName } from "@nightprint/tokens";
import { FlowDot } from "../atoms/flow-dot";
import { cx } from "../cx";

export interface ScoreboardLane {
  /** "RAG". */
  readonly label: string;
  /** What the lane does, in plain words: "Open book: looks up 3 passages". */
  readonly note: string;
  /** What the lane did last, as its log line reads; none before it has done anything. */
  readonly line: { readonly flow: FlowName; readonly text: string } | null;
  /** Once the run is over: whether the lane got it right. */
  readonly verdict?: "right" | "wrong" | undefined;
}

export interface ScoreboardProps {
  /** The panel's heading: "Bench". */
  readonly title: string;
  readonly lanes: readonly ScoreboardLane[];
}

/**
 * A bench's score, pinned beside its drawing: one row per lane, the last thing each one did
 * in its flow's colour, and at the end of the run which of them got it right.
 */
export function Scoreboard({ title, lanes }: ScoreboardProps) {
  return (
    <section
      aria-label={title}
      className="flex w-[24rem] max-w-full flex-col overflow-hidden rounded-xs border border-line bg-bg/90"
    >
      <p className="mono-label flex-none border-b border-line-muted px-3 py-1.5 text-text-secondary">
        {title}
      </p>
      <ol className="flex flex-col">
        {lanes.map((lane) => (
          <li
            key={lane.label}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 border-b border-line-muted px-3 py-2.5 last:border-b-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="mono-label text-text">{lane.label}</span>
              {lane.verdict && (
                <span
                  className={cx(
                    "mono-label",
                    lane.verdict === "right" ? "text-text-secondary" : "text-flow-error",
                  )}
                >
                  {lane.verdict === "right" ? "Right" : "Wrong"}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-micro text-text-secondary">{lane.note}</span>
              {lane.line ? (
                <span className="flex items-baseline gap-2 font-mono text-log">
                  <span className="translate-y-px">
                    <FlowDot flow={lane.line.flow} />
                  </span>
                  <span
                    className={cx(
                      lane.line.flow === "error" ? "text-flow-error" : "text-text-body",
                    )}
                  >
                    <Unbroken text={lane.line.text} />
                  </span>
                </span>
              ) : (
                <span className="font-mono text-log text-text-faint">—</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "P-7", "S-12": an identifier stays whole instead of breaking at its hyphen. */
function Unbroken({ text }: { readonly text: string }) {
  return text.split(/\b([A-Z]+-\d+)\b/).map((piece, index) =>
    index % 2 === 1 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one fixed string, in order.
      <span key={index} className="whitespace-nowrap">
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}
