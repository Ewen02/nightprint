import { MonoLabel } from "../atoms/mono-label";
import { StepDot } from "../atoms/step-dot";
import { RepoForm, type RepoFormProps } from "../molecules/repo-form";
import { SectionHeading } from "../molecules/section-heading";

export interface ImportStage {
  readonly label: string;
  readonly state: "done" | "current" | "upcoming";
}

export interface ImportPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: readonly string[];
  readonly form: Omit<RepoFormProps, "describedBy">;
  /** Where the drawing is, in order; empty before one starts. */
  readonly stages: readonly ImportStage[];
  /** Why the last drawing did not happen. */
  readonly error?: string;
  /** Fine print under the form: what is checked, what is limited. */
  readonly note?: string;
}

/** Draws a repository: its address, then the drawing's progress, read out as it changes. */
export function ImportPanel({ eyebrow, title, lead, form, stages, error, note }: ImportPanelProps) {
  return (
    <section aria-labelledby="import-title" className="flex max-w-180 flex-col gap-8">
      <SectionHeading id="import-title" eyebrow={eyebrow} title={title} lead={lead} />
      <RepoForm {...form} describedBy="import-status" />
      <div id="import-status" role="status" aria-live="polite" className="flex flex-col gap-3">
        {stages.length > 0 && (
          <ol className="flex flex-col gap-2">
            {stages.map((stage) => (
              <li key={stage.label} className="flex items-center gap-3">
                <StepDot flow="request" state={stage.state} />
                <MonoLabel
                  as="span"
                  tone={stage.state === "upcoming" ? "faint" : "secondary"}
                  flow={stage.state === "current" ? "request" : undefined}
                >
                  {stage.label}
                </MonoLabel>
              </li>
            ))}
          </ol>
        )}
        {error && <p className="text-small text-flow-error">{error}</p>}
      </div>
      {note && <p className="text-small text-text-faint">{note}</p>}
    </section>
  );
}
