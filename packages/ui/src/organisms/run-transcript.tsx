import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import { ChevronIcon } from "../atoms/chevron-icon";
import { FlowDot } from "../atoms/flow-dot";
import { MonoLabel } from "../atoms/mono-label";
import { SectionHeading } from "../molecules/section-heading";

export interface RunStepVariant {
  readonly key: string;
  /** The switches that play it instead: "Swap Postgres for InMemory". */
  readonly when: string;
  readonly title: string;
  readonly body: string;
  readonly flow: FlowName;
}

export interface RunStep {
  /** One-based, as the transport counts. */
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly flow: FlowName;
  /** What plays at this place once a switch is flipped. */
  readonly variants: readonly RunStepVariant[];
}

export interface RunScenario {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly RunStep[];
}

export interface RunTranscriptProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead?: readonly string[];
  readonly scenarios: readonly RunScenario[];
}

/**
 * Every scenario of a machine in words, step by step, with what each "what if"
 * plays instead. The stage shows one step at a time; this is the whole run, for
 * reading it through, for screen readers, and for crawlers, which never see a canvas.
 */
export function RunTranscript({ eyebrow, title, lead, scenarios }: RunTranscriptProps) {
  return (
    <section aria-labelledby="run-title" className="flex flex-col gap-10">
      <SectionHeading id="run-title" eyebrow={eyebrow} title={title} lead={lead} />
      <div className="flex flex-col gap-3">
        {scenarios.map((scenario, index) => (
          <details
            key={scenario.id}
            open={index === 0}
            className="group rounded-md border border-line bg-bg"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
              <h3 className="text-heading">{scenario.title}</h3>
              <span className="flex flex-none items-center gap-3 text-text-secondary">
                <MonoLabel as="span" tone="faint">
                  {scenario.steps.length} steps
                </MonoLabel>
                <ChevronIcon
                  direction="down"
                  className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </span>
            </summary>
            <ol className="flex flex-col divide-y divide-line-muted border-t border-line-muted">
              {scenario.steps.map((step) => (
                <li
                  key={step.number}
                  className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 px-4 py-4 sm:px-6"
                >
                  {/* The list already numbers the steps for screen readers. */}
                  <span aria-hidden="true" className="flex h-6 items-center gap-2">
                    <FlowDot flow={step.flow} />
                    <span className="mono-label text-text-faint">
                      {String(step.number).padStart(2, "0")}
                    </span>
                  </span>
                  <div className="flex max-w-170 flex-col gap-1">
                    <p className="text-body font-semibold text-text">{step.title}</p>
                    <p className="text-small text-text-muted">{step.body}</p>
                    {step.variants.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-3">
                        {step.variants.map((variant) => (
                          <li
                            key={variant.key}
                            className="flex flex-col gap-1 border-l-2 pl-3"
                            style={{ borderColor: flowColour[variant.flow] }}
                          >
                            <MonoLabel as="span" tone="faint">
                              What if · {variant.when}
                            </MonoLabel>
                            <p className="text-small font-semibold text-text">{variant.title}</p>
                            <p className="text-small text-text-muted">{variant.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </section>
  );
}
