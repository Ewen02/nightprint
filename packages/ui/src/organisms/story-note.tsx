import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import type { ReactNode } from "react";
import { Balloon } from "../atoms/balloon";
import { MonoLabel } from "../atoms/mono-label";
import { cx } from "../cx";
import { LogLine } from "../molecules/log-line";
import type { EventLogEntry } from "./event-log";

export interface StoryNoteProps {
  /** Anchor of the note; its heading's id derives from it. */
  readonly id: string;
  /** "Step 3 / 8 · Place an order". */
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly flow: FlowName;
  /** Balloon numbers of the parts the note is about: the same discs as on the drawing. */
  readonly parts?: readonly number[];
  /** What the step writes to the log, at its simulated time. */
  readonly log?: readonly EventLogEntry[];
  /** The note the machine is playing. */
  readonly active: boolean;
  /** Under the body: a switch, actions. */
  readonly children?: ReactNode;
}

/**
 * One note of a machine's story, written in the margin of the drawing. The note the
 * machine is playing takes its step's colour: a rule down its side, its label, and
 * the balloons of its parts, lit like the parts themselves.
 */
export function StoryNote({
  id,
  eyebrow,
  title,
  body,
  flow,
  parts = [],
  log = [],
  active,
  children,
}: StoryNoteProps) {
  const accent = flowColour[flow];
  return (
    <div
      id={id}
      className="flex flex-col gap-3 border-l-2 pl-5 transition-colors duration-500 ease-machine motion-reduce:transition-none"
      style={{ borderColor: active ? accent : "transparent" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <MonoLabel flow={active ? flow : undefined}>{eyebrow}</MonoLabel>
        {parts.length > 0 && (
          <span className="flex gap-1">
            {parts.map((number) => (
              <Balloon key={number} number={number} size="sm" flow={active ? flow : null} />
            ))}
          </span>
        )}
      </div>
      {/* A step under the story's own heading. */}
      <h3 className="text-title">{title}</h3>
      <p className="text-body text-text-muted">{body}</p>
      {children}
      {log.length > 0 && (
        <ol
          className={cx(
            "@container mt-1 flex flex-col gap-1.5 rounded-xs border bg-inset p-3 transition-colors duration-500 ease-machine motion-reduce:transition-none",
            active ? "border-line-strong" : "border-line-muted",
          )}
        >
          {log.map(({ key, ...entry }) => (
            <LogLine key={key} {...entry} />
          ))}
        </ol>
      )}
    </div>
  );
}
