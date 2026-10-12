"use client";

import { type WhatIfCase, WhatIfShowcase } from "@nightprint/ui";
import { useMemo, useState } from "react";
import { logExcerpt, scenarioFor, stepHeadline, whatIfSwitch } from "../home-view-model";
import { machineBySlug } from "./machine-by-slug";

export interface WhatIfDemoCase {
  /** The switch of this panel. It starts on. */
  readonly action: string;
  /** Actions that stay on whatever the switch says. */
  readonly with?: readonly string[];
  /** The step the caption names (1-based). */
  readonly step: number;
  /** The steps whose log lines the panel prints (1-based). */
  readonly log: readonly number[];
}

/** The "what if" section: each switch replays the scenario and its panel prints the new log. */
export function WhatIfDemo({
  slug,
  eyebrow,
  title,
  lead,
  cases,
}: {
  readonly slug: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: readonly string[];
  readonly cases: readonly WhatIfDemoCase[];
}) {
  const machine = useMemo(() => machineBySlug(slug), [slug]);
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set());

  const panels: WhatIfCase[] = cases.map((item) => {
    const on = !off.has(item.action);
    const scenario = scenarioFor(machine, [...(item.with ?? []), ...(on ? [item.action] : [])]);
    return {
      id: item.action,
      caption: stepHeadline(scenario, item.step),
      ...whatIfSwitch(machine, item.action),
      on,
      log: logExcerpt(scenario, item.log),
    };
  });

  return (
    <WhatIfShowcase
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      cases={panels}
      onToggle={(id, on) =>
        setOff((current) => {
          const next = new Set(current);
          if (on) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        })
      }
    />
  );
}
