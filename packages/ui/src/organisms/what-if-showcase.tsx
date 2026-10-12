import type { FlowName } from "@nightprint/tokens";
import { Well } from "../atoms/well";
import { LogLine } from "../molecules/log-line";
import { SectionHeading } from "../molecules/section-heading";
import { WhatIfSwitch } from "../molecules/what-if-switch";

export interface WhatIfCase {
  readonly id: string;
  /** Where the scenario stands: "Step 5 / 7 · InMemory answers". */
  readonly caption: string;
  readonly label: string;
  readonly description: string;
  readonly tone: "safe" | "violation";
  readonly on: boolean;
  /** What the log reads at that point. */
  readonly log: readonly {
    readonly key: string;
    readonly time: string;
    readonly flow: FlowName;
    readonly tag: string;
    readonly text: string;
  }[];
}

export interface WhatIfShowcaseProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: readonly string[];
  readonly cases: readonly WhatIfCase[];
  readonly onToggle?: (id: string, on: boolean) => void;
}

/** "What if" switches next to the log they change, one panel per switch. */
export function WhatIfShowcase({ eyebrow, title, lead, cases, onToggle }: WhatIfShowcaseProps) {
  return (
    <section aria-labelledby="what-if-title" className="flex flex-wrap items-start gap-12">
      <div className="min-w-0 flex-[1_1_320px]">
        <SectionHeading id="what-if-title" eyebrow={eyebrow} title={title} lead={lead} />
      </div>
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        {cases.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-md border border-line bg-bg p-4"
          >
            <p className="font-mono text-micro tracking-[0.08em] text-text-faint uppercase">
              {item.caption}
            </p>
            <WhatIfSwitch
              label={item.label}
              description={item.description}
              on={item.on}
              tone={item.tone}
              onToggle={(on) => onToggle?.(item.id, on)}
            />
            <div aria-live="polite">
              <Well as="ul" className="flex flex-col gap-1.5">
                {item.log.map((entry) => (
                  <LogLine
                    key={entry.key}
                    time={entry.time}
                    flow={entry.flow}
                    tag={entry.tag}
                    text={entry.text}
                  />
                ))}
              </Well>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
