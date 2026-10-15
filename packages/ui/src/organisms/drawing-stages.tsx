"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import { cx } from "../cx";

export interface DrawingStage {
  readonly key: string;
  /** Its name on the tab: "Read". */
  readonly label: string;
  /** What it amounts to, under the name: "176 files". */
  readonly count: string;
  readonly title: string;
  readonly body: string;
  /** The stage as the product shows it: a file grid, a sketch, a plan. */
  readonly figure: ReactNode;
}

export interface DrawingStagesProps {
  /** Name of the tab list: "Stages of a drawing". */
  readonly label: string;
  readonly stages: readonly DrawingStage[];
}

/**
 * The stages of a drawing in one ruled frame: a tab per stage across its top, like the
 * cells of a ruler, and under them the stage chosen, in words beside its picture.
 * Arrow keys move from tab to tab.
 */
export function DrawingStages({ label, stages }: DrawingStagesProps) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const stage = stages[selected];
  const move = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = (selected + step + stages.length) % stages.length;
    setSelected(next);
    tabs.current[next]?.focus();
  };
  return (
    <div className="border border-frame bg-bg">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={move}
        className="grid grid-cols-2 border-b border-line-strong lg:grid-cols-4"
      >
        {stages.map((item, index) => (
          <button
            key={item.key}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === selected}
            aria-controls={`${id}-panel`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
            className={cx(
              "relative flex min-h-11 flex-col gap-1 px-4 pt-3 pb-3.5 text-left transition-colors hover:bg-surface",
              index % 2 === 1 && "border-l border-line-muted",
              index > 1 && "max-lg:border-t",
              index === 2 && "lg:border-l",
              index === selected ? "text-text" : "text-text-secondary",
            )}
          >
            <span className="mono-label">
              {index + 1} · {item.label}
            </span>
            <span className="text-small text-text-body">{item.count}</span>
            {index === selected && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-flow-request"
              />
            )}
          </button>
        ))}
      </div>
      {stage && (
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${selected}`}
          className="grid gap-8 p-6 lg:min-h-105 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10 lg:p-10"
        >
          <div className="flex flex-col gap-4">
            <h3 className="text-title">{stage.title}</h3>
            <p className="text-body text-text-muted">{stage.body}</p>
          </div>
          <figure className="m-0 flex min-w-0 flex-col gap-3">
            {stage.figure}
            <figcaption className="mono-label text-text-faint">{stage.count}</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
