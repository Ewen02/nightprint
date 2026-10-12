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
  /** As the switches show it: `violation` when one of them breaks the pattern. */
  readonly tone?: "safe" | "violation";
  /** Where the machine plays it, those switches on. */
  readonly href?: string;
}

export interface RunStep {
  /** One-based, as the transport counts. */
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly flow: FlowName;
  /** What plays at this place once a switch is flipped. */
  readonly variants: readonly RunStepVariant[];
  /** Where the machine plays this step. */
  readonly href?: string;
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
  /** The word of a link to where the stage plays a step: "Play". */
  readonly play?: string;
}

/** A link to where the stage plays a step. Its copies are the same page: no need to follow. */
function PlayLink({ href, text, label }: { href: string; text: string; label: string }) {
  return (
    <a
      href={href}
      rel="nofollow"
      aria-label={label}
      className="mono-label inline-flex flex-none items-center text-text-faint transition-colors hover:text-text"
    >
      {text}
      <ChevronIcon direction="right" className="-mr-1" />
    </a>
  );
}

/**
 * The track and knob of a switch that is on, small: what a variant needs to play.
 * In the switch's own colour, as the what-if panel draws it.
 */
function SwitchOn({ tone }: { tone: "safe" | "violation" }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-3 w-5 flex-none rounded-full"
      style={{ background: tone === "violation" ? flowColour.error : flowColour.write }}
    >
      <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-bg" />
    </span>
  );
}

/**
 * Every scenario of a machine in words, step by step. Beside each step, what plays
 * in its place once a "what if" switch is on, forked off it in its flow's colour. The
 * stage shows one step at a time; this is the whole run, for reading it through, for
 * screen readers, and for crawlers, which never see a canvas.
 */
export function RunTranscript({ eyebrow, title, lead, scenarios, play }: RunTranscriptProps) {
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
                  className="grid gap-x-10 gap-y-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3">
                    <span className="flex flex-col items-start gap-1">
                      {/* The list already numbers the steps for screen readers. */}
                      <span aria-hidden="true" className="flex h-6 items-center gap-2">
                        <FlowDot flow={step.flow} />
                        <span className="mono-label text-text-faint">
                          {String(step.number).padStart(2, "0")}
                        </span>
                      </span>
                      {step.href && play && (
                        <PlayLink
                          href={step.href}
                          text={play}
                          label={`${play} step ${step.number}, ${step.title}`}
                        />
                      )}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-body font-semibold text-text">{step.title}</p>
                      <p className="text-small text-text-muted">{step.body}</p>
                    </div>
                  </div>
                  {step.variants.length > 0 && (
                    <ul
                      aria-label={`In place of step ${step.number}, once a switch is on`}
                      className="flex flex-col gap-4 pl-[4.25rem] lg:pl-0"
                    >
                      {step.variants.map((variant, i) => (
                        <li
                          key={variant.key}
                          className="relative flex flex-col gap-1 border-l-2 pl-4"
                          style={{ borderColor: flowColour[variant.flow] }}
                        >
                          {/*
                            The fork, drawn in the gutter like a construction line: out of the
                            step, down a rail, and into each step that can replace it.
                          */}
                          <span
                            aria-hidden="true"
                            className={`absolute top-3 hidden h-px bg-line-strong lg:block ${i === 0 ? "-left-10.5 w-10" : "-left-5.5 w-5"}`}
                          />
                          {i > 0 && (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 -left-5.5 hidden h-3 w-px bg-line-strong lg:block"
                            />
                          )}
                          {i < step.variants.length - 1 && (
                            <span
                              aria-hidden="true"
                              className="absolute top-3 -bottom-4 -left-5.5 hidden w-px bg-line-strong lg:block"
                            />
                          )}
                          <div className="flex items-start gap-3">
                            <p className="flex flex-1 items-start gap-2 text-small text-text-secondary">
                              <span className="flex h-5 items-center">
                                <SwitchOn tone={variant.tone ?? "safe"} />
                              </span>
                              <span>
                                <span className="sr-only">With </span>
                                {variant.when}
                              </span>
                            </p>
                            {variant.href && play && (
                              <PlayLink
                                href={variant.href}
                                text={play}
                                label={`${play} step ${step.number} with ${variant.when}, ${variant.title}`}
                              />
                            )}
                          </div>
                          <p className="text-body font-semibold text-text">{variant.title}</p>
                          <p className="text-small text-text-muted">{variant.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </section>
  );
}
