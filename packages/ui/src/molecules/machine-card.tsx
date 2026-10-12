import { MonoLabel } from "../atoms/mono-label";

export interface MachineCardProps {
  readonly code: string;
  readonly title: string;
  readonly family: string;
  /** Published machines link to their page; upcoming ones have no href. */
  readonly href?: string;
  readonly category?: string;
  readonly summary?: string;
}

/** A machine in the catalogue. Without `href`, it is drawn as upcoming. */
export function MachineCard({ code, title, family, href, category, summary }: MachineCardProps) {
  if (!href) {
    return (
      <div className="flex h-full flex-col gap-3 rounded-md border border-dashed border-line p-5">
        <MonoLabel as="span" tone="faint" className="flex justify-between">
          <span>{code}</span>
          <span>{family} · soon</span>
        </MonoLabel>
        <span className="text-heading text-text-faint">{title}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      className="flex h-full flex-col gap-3 rounded-md border border-line bg-surface p-5 transition-colors hover:border-frame"
    >
      <MonoLabel as="span" className="flex justify-between">
        <span className="text-text">{code}</span>
        <span>
          {family}
          {category ? ` · ${category}` : ""}
        </span>
      </MonoLabel>
      <span className="text-heading">{title}</span>
      {summary && <span className="text-small text-text-muted">{summary}</span>}
    </a>
  );
}
