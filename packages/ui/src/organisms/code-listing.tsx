import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import { useEffect, useRef } from "react";
import { cx } from "../cx";

export interface CodeListingProps {
  /** The program, one string per line. */
  readonly lines: readonly string[];
  /** The line running now, from 1; none between runs. */
  readonly current?: number | null;
  /** Colour of the running line: the flow of the step. */
  readonly flow?: FlowName | null;
  /** What the program has printed so far, in order; none for a program that never prints. */
  readonly output?: readonly string[] | undefined;
}

/**
 * The program a machine runs, pinned beside its drawing like a listing sheet: numbered
 * lines, the one running now marked in the step's colour, and the console under it,
 * filling as the program prints. Given less height than it needs, its lines scroll and
 * keep the running one in view.
 */
export function CodeListing({ lines, current = null, flow = null, output }: CodeListingProps) {
  const accent = flow ? flowColour[flow] : undefined;
  const list = useRef<HTMLOListElement>(null);
  // Scrolls the list itself, never the page: a step change must not move the reader.
  useEffect(() => {
    const ol = list.current;
    const line = current === null ? null : ol?.children[current - 1];
    if (!ol || !(line instanceof HTMLElement)) {
      return;
    }
    const top = line.offsetTop - ol.offsetTop;
    if (top < ol.scrollTop || top + line.offsetHeight > ol.scrollTop + ol.clientHeight) {
      ol.scrollTop = Math.max(0, top - ol.clientHeight / 2 + line.offsetHeight / 2);
    }
  }, [current]);
  return (
    <section
      aria-label="Program"
      className="flex min-h-0 w-[24rem] max-w-full flex-col overflow-hidden rounded-xs border border-line bg-bg/90"
    >
      <p className="mono-label flex-none border-b border-line-muted px-3 py-1.5 text-text-secondary">
        Listing
      </p>
      <ol ref={list} className="flex min-h-0 flex-col overflow-y-auto py-1.5 font-mono text-log">
        {lines.map((line, index) => {
          const number = index + 1;
          const running = number === current;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: a listing's lines never reorder.
              key={index}
              aria-current={running ? "step" : undefined}
              className={cx(
                "flex gap-3 border-l-2 px-3 transition-colors duration-200 motion-reduce:transition-none",
                running ? "bg-text/6 text-text" : "border-transparent text-text-secondary",
              )}
              style={running && accent ? { borderColor: accent } : undefined}
            >
              <span aria-hidden="true" className="w-3 flex-none text-right text-text-faint">
                {number}
              </span>
              <code className="whitespace-pre">{line}</code>
            </li>
          );
        })}
      </ol>
      {output && (
        <div className="flex flex-none items-baseline gap-3 border-t border-line-muted px-3 py-1.5">
          <span className="mono-label text-text-secondary">Console</span>
          <output className="flex flex-wrap gap-x-2.5 font-mono text-log text-text">
            {output.length > 0 ? (
              output.map((line, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: printed lines only ever append.
                <span key={index}>{line}</span>
              ))
            ) : (
              <span className="text-text-faint">—</span>
            )}
          </output>
        </div>
      )}
    </section>
  );
}
