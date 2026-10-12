"use client";

import { LogLine, PartRow, StepDots, Well, WhatIfSwitch } from "@nightprint/ui";
import { useMemo, useState } from "react";
import { logExcerpt, partRows, scenarioFor, stepNumberOf, whatIfSwitch } from "../home-view-model";
import { stepDotItems } from "../machine-view-model";
import { machineBySlug } from "./machine-by-slug";

/** The step bars of the scenario: pick a step, read what it logged. */
export function RequestDemo({ slug, step }: { readonly slug: string; readonly step: string }) {
  const scenario = useMemo(() => scenarioFor(machineBySlug(slug)), [slug]);
  const [current, setCurrent] = useState(() => stepNumberOf(scenario, step) - 1);
  return (
    <Well className="flex flex-col gap-3">
      <StepDots steps={stepDotItems(scenario)} current={current} onSeek={setCurrent} />
      <ul aria-live="polite">
        {logExcerpt(scenario, [current + 1]).map((line) => (
          <LogLine
            key={line.key}
            time={line.time}
            flow={line.flow}
            tag={line.tag}
            text={line.text}
          />
        ))}
      </ul>
    </Well>
  );
}

/** One of the machine's switches, on to begin with. */
export function SwitchDemo({ slug, action }: { readonly slug: string; readonly action: string }) {
  const item = useMemo(() => whatIfSwitch(machineBySlug(slug), action), [slug, action]);
  const [on, setOn] = useState(true);
  return (
    <WhatIfSwitch
      label={item.label}
      description={item.description}
      tone={item.tone}
      on={on}
      onToggle={setOn}
    />
  );
}

/** A few rows of the bill of parts, lit as during `step`. Pressing a row selects it. */
export function PartsDemo({
  slug,
  parts,
  step,
}: {
  readonly slug: string;
  readonly parts: readonly string[];
  readonly step: string;
}) {
  const { rows, focus, flow } = useMemo(() => {
    const machine = machineBySlug(slug);
    const scenario = scenarioFor(machine);
    const lit = scenario.steps[stepNumberOf(scenario, step) - 1];
    return {
      rows: partRows(machine, parts),
      focus: new Set(lit?.step.focus),
      flow: lit?.flow ?? null,
    };
  }, [slug, parts, step]);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ol>
      {rows.map((row) => (
        <li key={row.id}>
          <PartRow
            number={row.number}
            label={row.label}
            role={row.role}
            flow={focus.has(row.id) ? flow : null}
            selected={row.id === selected}
            onSelect={() => setSelected(row.id === selected ? null : row.id)}
          />
        </li>
      ))}
    </ol>
  );
}
