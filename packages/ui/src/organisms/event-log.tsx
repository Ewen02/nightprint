import type { FlowName } from "@nightprint/tokens";
import type { ClipboardEvent } from "react";
import { ChevronIcon } from "../atoms/chevron-icon";
import { cx } from "../cx";
import { LogLine } from "../molecules/log-line";

export interface EventLogEntry {
  readonly key: string;
  /** Simulated time, already formatted. */
  readonly time: string;
  readonly flow: FlowName;
  readonly tag: string;
  readonly text: string;
}

export interface EventLogProps {
  readonly entries: readonly EventLogEntry[];
  readonly className?: string;
}

/**
 * Copying across lines gives one line per event, time, tag and text on it, as seen;
 * within a single line the browser copies the selected characters as usual.
 */
function copyLines(event: ClipboardEvent<HTMLElement>) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }
  const lines = [...event.currentTarget.querySelectorAll<HTMLLIElement>("li[data-copy]")].filter(
    (li) => selection.containsNode(li, true),
  );
  if (lines.length < 2) {
    return;
  }
  event.preventDefault();
  event.clipboardData.setData("text/plain", lines.map((li) => li.dataset.copy).join("\n"));
}

/** The console under the machine: what it has done so far, the latest line in view. */
export function EventLog({ entries, className }: EventLogProps) {
  return (
    // On the whole log: a selection may start on its heading and still take its lines.
    <details
      open
      className={cx("group border-t border-line-muted bg-inset", className)}
      onCopy={copyLines}
    >
      <summary className="mono-label flex h-12 cursor-pointer list-none items-center justify-between px-4 text-text-secondary sm:px-6">
        <span>Event log · {entries.length}</span>
        <ChevronIcon direction="up" className="transition-transform group-open:rotate-180" />
      </summary>
      {/*
        A console: the last lines in view, the newest at the bottom and set apart. The
        scroll box runs column-reverse around a single list, which browsers keep scrolled
        to its end without any script, while the lines stay in reading order, so a
        selection follows what is seen. Focusable, so the keyboard can scroll back.
      */}
      <section
        aria-label="Event log lines"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be reachable by keyboard.
        tabIndex={0}
        className="flex max-h-28 flex-col-reverse overflow-y-auto px-4 pb-4 sm:px-6"
      >
        <ol aria-live="polite" className="@container flex flex-col gap-1.5">
          {entries.map((entry, index) => (
            <LogLine
              key={entry.key}
              time={entry.time}
              flow={entry.flow}
              tag={entry.tag}
              text={entry.text}
              current={index === entries.length - 1}
            />
          ))}
        </ol>
      </section>
    </details>
  );
}
