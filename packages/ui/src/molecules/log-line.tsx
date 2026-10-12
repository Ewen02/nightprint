import type { FlowName } from "@nightprint/tokens";
import { FlowTag } from "../atoms/flow-tag";
import { cx } from "../cx";

export interface LogLineProps {
  /** Simulated time, already formatted ("4.27 ms"). */
  readonly time: string;
  readonly flow: FlowName;
  readonly tag: string;
  readonly text: string;
  /** The line just written: set apart from the ones before it. */
  readonly current?: boolean;
}

/** One line of the event log: time, tag, message. Errors print their message in vermillon. */
export function LogLine({ time, flow, tag, text, current = false }: LogLineProps) {
  return (
    <li
      // What copying several lines gives for this one: on one line, as seen.
      data-copy={`${time}  ${tag}  ${text}`}
      className={cx(
        "-mx-1.5 grid grid-cols-[84px_52px_minmax(0,1fr)] gap-3 rounded-xs px-1.5 font-mono text-log transition-colors duration-200 ease-machine motion-reduce:transition-none",
        // The line just written arrives; older lines only lose its highlight.
        current && "animate-enter bg-text/6 motion-reduce:animate-none",
      )}
    >
      <span className="text-text-faint tabular-nums">{time}</span>
      <FlowTag flow={flow}>{tag}</FlowTag>
      {/* Breaks long identifiers such as OrderRepository.save(order#1042) on phones. */}
      <span
        className={cx("wrap-break-word", flow === "error" ? "text-flow-error" : "text-text-body")}
      >
        {text}
      </span>
    </li>
  );
}
