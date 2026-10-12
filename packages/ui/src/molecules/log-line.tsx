import type { FlowName } from "@nightprint/tokens";
import type { ReactNode } from "react";
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

/**
 * Where a long message may wrap: after a dot that joins two names
 * (`PaymentGateway.charge`) and after an arrow. Without these, a narrow screen cuts
 * inside a word; the class's anywhere-break stays the last resort.
 */
const BREAK = /(?<=\.)(?=[A-Za-z])|(?<=→)/;

function breakable(text: string): ReactNode[] {
  return text
    .split(BREAK)
    .flatMap((part, index) => (index === 0 ? [part] : [<wbr key={part + String(index)} />, part]));
}

/**
 * One line of the event log: time, tag, message. Errors print their message in vermillon.
 * Laid out by the width of its list, which must be a container (`@container`).
 */
export function LogLine({ time, flow, tag, text, current = false }: LogLineProps) {
  return (
    <li
      // What copying several lines gives for this one: on one line, as seen.
      data-copy={`${time}  ${tag}  ${text}`}
      className={cx(
        "-mx-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 @min-[22rem]:grid-cols-[84px_52px_minmax(0,1fr)] @min-[22rem]:gap-y-3 rounded-xs px-1.5 font-mono text-log transition-colors duration-200 ease-machine motion-reduce:transition-none",
        // The line just written arrives; older lines only lose its highlight.
        current && "animate-enter bg-text/6 motion-reduce:animate-none",
      )}
    >
      <span className="text-text-faint tabular-nums">{time}</span>
      <FlowTag flow={flow}>{tag}</FlowTag>
      {/* Breaks long identifiers such as OrderRepository.save(order#1042) on phones. */}
      <span
        // In a narrow list (a phone, a story note) the message takes the whole width under
        // its time and tag: a long name such as PaymentProviderAdapter then fits whole.
        className={cx(
          "col-span-2 wrap-break-word @min-[22rem]:col-span-1",
          flow === "error" ? "text-flow-error" : "text-text-body",
        )}
      >
        {breakable(text)}
      </span>
    </li>
  );
}
