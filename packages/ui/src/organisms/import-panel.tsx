import { RepoForm, type RepoFormProps } from "../molecules/repo-form";
import { SectionHeading } from "../molecules/section-heading";

export interface ImportPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: readonly string[];
  readonly form: Omit<RepoFormProps, "describedBy">;
  /** Why the last drawing did not happen. */
  readonly error?: string;
  /** Fine print under the form: what is checked, what is limited. */
  readonly note?: string;
}

/** Draws a repository: its address, and why the last drawing did not happen, read out. */
export function ImportPanel({ eyebrow, title, lead, form, error, note }: ImportPanelProps) {
  return (
    <section aria-labelledby="import-title" className="flex max-w-180 flex-col gap-8">
      <SectionHeading id="import-title" eyebrow={eyebrow} title={title} lead={lead} />
      <RepoForm {...form} describedBy="import-status" />
      <div id="import-status" role="status" aria-live="polite" className="flex flex-col gap-3">
        {error && <p className="text-small text-flow-error">{error}</p>}
      </div>
      {note && <p className="text-small text-text-faint">{note}</p>}
    </section>
  );
}
