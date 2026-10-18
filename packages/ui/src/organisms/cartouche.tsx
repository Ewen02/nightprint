import { cx } from "../cx";

export interface CartoucheProps {
  readonly title: string;
  readonly code: string;
  /** The series the sheet belongs to, as read: "Failure mode". */
  readonly series?: string | undefined;
  /** "NTS" (not to scale) for every machine so far. */
  readonly scale: string;
  readonly revision: string;
  readonly source?: { readonly label: string; readonly url: string } | undefined;
  readonly className?: string;
}

const cell = "px-2.5 py-1.5";

/** The title block of a technical drawing: title, code, scale, revision, series, source. */
export function Cartouche({
  title,
  code,
  series,
  scale,
  revision,
  source,
  className,
}: CartoucheProps) {
  return (
    <div
      className={cx(
        "w-64 border border-frame bg-bg/85 font-mono text-micro tracking-[0.08em] text-text-body",
        className,
      )}
    >
      <p
        className={cx(
          cell,
          "border-b border-frame text-small font-semibold tracking-normal text-text",
        )}
      >
        {title}
      </p>
      <dl className="grid grid-cols-3">
        <div className={cx(cell, "border-r border-frame")}>
          <dt className="text-text-faint">CODE</dt>
          <dd>{code}</dd>
        </div>
        <div className={cx(cell, "border-r border-frame")}>
          <dt className="text-text-faint">SCALE</dt>
          <dd>{scale}</dd>
        </div>
        <div className={cell}>
          <dt className="text-text-faint">REV</dt>
          <dd>{revision}</dd>
        </div>
        {series && (
          <div className={cx(cell, "col-span-3 border-t border-frame")}>
            <dt className="text-text-faint">SERIES</dt>
            <dd>{series}</dd>
          </div>
        )}
        {source && (
          <div className={cx(cell, "col-span-3 border-t border-frame")}>
            <dt className="text-text-faint">SOURCE</dt>
            <dd>
              <a href={source.url} className="underline decoration-frame underline-offset-2">
                {source.label}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
