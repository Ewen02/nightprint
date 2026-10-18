import { Fragment, type ReactNode } from "react";
import { ButtonLink } from "../atoms/button-link";
import { cx } from "../cx";
import { FilterChips, type FilterOption } from "../molecules/filter-chips";
import { SectionHeading } from "../molecules/section-heading";

export interface RegisterRow {
  readonly code: string;
  readonly title: string;
  /** The family, as read: "Backend". */
  readonly family: string;
  readonly status: "issued" | "draft";
  /** An issued sheet's revision letter. */
  readonly revision?: string;
  /** An issued sheet links to its machine. */
  readonly href?: string;
}

/** A series of sheets, as a drawing set groups its sheets by discipline. */
export interface RegisterGroup {
  /** The group's anchor: "series-fmd". */
  readonly id: string;
  /** The series' code prefix: "FMD". */
  readonly code: string;
  /** "Failure modes". */
  readonly label: string;
  /** What a sheet of the series is: "A failure replayed, then repaired". */
  readonly rule: string;
  /** Issued sheets first, then drafts. */
  readonly rows: readonly RegisterRow[];
}

export interface DrawingRegisterProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  /** The series shown, already filtered, each with its sheets. */
  readonly groups: readonly RegisterGroup[];
  /** One per series, and "All". */
  readonly filters: readonly FilterOption[];
  /** Id of the pressed filter. */
  readonly filter: string;
  readonly onFilterChange?: (id: string) => void;
  /** Code of the sheet in the preview. */
  readonly selected: string;
  /** A row is pointed at or tapped, or its title takes the focus. */
  readonly onSelect?: (code: string) => void;
  /** The selected sheet: beside the register from wide screens up, under its own row below. */
  readonly preview: ReactNode;
  /** Under the lead: what the visitor can do about the register (vote on the next one). */
  readonly action?: { readonly label: string; readonly href: string };
}

const COLUMNS = [
  { label: "Dwg no.", className: "" },
  { label: "Title", className: "" },
  { label: "Family", className: "max-sm:hidden" },
  { label: "Status", className: "" },
  { label: "Rev", className: "max-sm:hidden" },
] as const;

/**
 * The catalogue as the register of a drawing set: the sheets grouped by series, one row
 * per sheet, issued or in draft, and the sheet pointed at shown beside it, as if pulled
 * from the plan chest.
 */
export function DrawingRegister({
  eyebrow,
  title,
  lead,
  groups,
  filters,
  filter,
  onFilterChange,
  selected,
  onSelect,
  preview,
  action,
}: DrawingRegisterProps) {
  return (
    <section aria-labelledby="register-title" className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-155 flex-col items-start gap-6">
          <SectionHeading id="register-title" eyebrow={eyebrow} title={title} lead={[lead]} />
          {action && (
            <ButtonLink href={action.href} variant="secondary">
              {action.label}
            </ButtonLink>
          )}
        </div>
        <FilterChips
          label="Filter by series"
          options={filters}
          value={filter}
          onChange={onFilterChange}
        />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27.5rem)] lg:items-start">
        <div className="hidden lg:sticky lg:top-8 lg:order-last lg:block">{preview}</div>
        <table className="w-full border-collapse">
          <caption className="sr-only">Drawing register</caption>
          <thead>
            <tr className="border-y border-frame">
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cx(
                    "mono-label py-2.5 pr-4 text-left font-medium text-text-faint first:pl-3",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.id} id={group.id} className="scroll-mt-8">
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={COLUMNS.length}
                  className="border-b border-line-muted pt-7 pb-2.5 pl-3 text-left font-normal"
                >
                  <span className="mono-label text-text">
                    {group.code} · {group.label}
                  </span>
                  <span className="ml-3 text-small text-text-faint max-sm:block max-sm:ml-0 max-sm:pt-1">
                    {group.rule}
                  </span>
                </th>
              </tr>
              {group.rows.map((row) => {
                const active = row.code === selected;
                const issued = row.status === "issued";
                return (
                  <Fragment key={row.code}>
                    <tr
                      // Pointing only previews the sheet: the row's link does it on focus, and the
                      // register itself holds everything the preview shows.
                      onMouseEnter={() => onSelect?.(row.code)}
                      className={cx(
                        "border-b border-line-muted transition-colors duration-200 ease-machine",
                        active && "bg-surface",
                      )}
                    >
                      <td
                        className={cx(
                          "border-l-2 py-4 pr-4 pl-2.5 font-mono text-micro tracking-[0.08em] whitespace-nowrap",
                          active
                            ? "border-text text-text"
                            : "border-transparent text-text-secondary",
                        )}
                      >
                        {row.code}
                      </td>
                      <td className="py-4 pr-4">
                        {row.href ? (
                          <a
                            href={row.href}
                            onFocus={() => onSelect?.(row.code)}
                            className="text-heading text-text underline decoration-transparent underline-offset-4 transition-colors hover:decoration-text"
                          >
                            {row.title}
                          </a>
                        ) : (
                          // A draft has no page yet: its title pulls its sheet, for a tap or a key.
                          <button
                            type="button"
                            aria-expanded={active}
                            onClick={() => onSelect?.(row.code)}
                            onFocus={() => onSelect?.(row.code)}
                            className={cx(
                              "text-left text-heading transition-colors hover:text-text",
                              active ? "text-text" : "text-text-secondary",
                            )}
                          >
                            {row.title}
                          </button>
                        )}
                      </td>
                      <td className="mono-label py-4 pr-4 text-text-faint max-sm:hidden">
                        {row.family}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={cx(
                            "mono-label flex items-center gap-2 whitespace-nowrap",
                            issued ? "text-text" : "text-text-faint",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cx(
                              "size-2 flex-none rounded-full border",
                              issued ? "border-text bg-text" : "border-ring",
                            )}
                          />
                          {issued ? "Issued" : "In draft"}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-mono text-micro text-text-body max-sm:hidden">
                        {row.revision ?? "—"}
                      </td>
                    </tr>
                    {/* Below wide screens there is no room beside the register: the sheet opens under its row. */}
                    {active && preview && (
                      <tr className="lg:hidden">
                        <td colSpan={COLUMNS.length} className="pt-1 pb-6">
                          {preview}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
