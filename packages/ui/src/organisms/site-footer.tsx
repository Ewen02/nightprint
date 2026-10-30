import { ButtonLink } from "../atoms/button-link";
import { LogoMark } from "../atoms/logo-mark";
import { cx } from "../cx";

export interface SeriesSheet {
  readonly code: string;
  readonly title: string;
  /** Live: its page is published. */
  readonly live: boolean;
}

export interface SiteFooterProps {
  readonly title: string;
  readonly tagline: string;
  /** Where the series stands: every machine, live or to come, and the next one. */
  readonly series?: {
    readonly sheets: readonly SeriesSheet[];
    readonly next?: SeriesSheet;
    /** Where the build is posted as it happens. */
    readonly follow?: { readonly label: string; readonly href: string };
  };
  /** The sections of the site. */
  readonly links?: readonly { readonly label: string; readonly href: string }[];
  /** Who made it, linked to their site, and the year. */
  readonly credit: { readonly name: string; readonly href?: string; readonly year: string };
}

const LINK =
  "underline decoration-frame underline-offset-4 transition-colors hover:decoration-text";

/**
 * The page's content column inside the frame. Sections centre a 75rem column padded
 * 1rem (1.5rem from sm); the frame sits 9 px in (13 px from sm, border included), so the
 * column here is that much narrower and less padded: its text lines up with theirs at
 * every width, while the frame runs edge to edge like the header's.
 */
const COLUMN = "mx-auto px-[7px] sm:max-w-[73.375rem] sm:px-[11px]";

/**
 * Every page ends on two ruled lines: the name, the machine that comes next and how
 * far the series has got, then the site's sections and who made it.
 */
export function SiteFooter({ title, tagline, series, links = [], credit }: SiteFooterProps) {
  const live = series?.sheets.filter((sheet) => sheet.live).length ?? 0;
  return (
    <footer className="px-2 pt-16 pb-2 sm:px-3 sm:pb-3">
      <div className="border border-line-strong">
        <div
          className={`${COLUMN} grid gap-x-10 gap-y-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-center`}
        >
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2.5 text-heading text-text">
              <LogoMark />
              {title}
            </p>
            <p className="max-w-96 text-small text-text-muted">{tagline}</p>
          </div>
          {series && (
            <div className="flex flex-col gap-2">
              {series.next && (
                <p className="text-small text-text-muted">
                  <span className="mono-label text-text-faint">Next machine</span>
                  <span className="mt-1 block text-heading text-text">{series.next.title}</span>
                </p>
              )}
              <div className="flex items-center gap-3">
                <ol aria-label="Machines" className="flex gap-1">
                  {series.sheets.map((sheet) => (
                    <li key={sheet.code}>
                      <span
                        aria-hidden="true"
                        className={cx(
                          "block h-1.5 w-5 rounded-xs border",
                          sheet.live ? "border-text bg-text" : "border-ring",
                        )}
                      />
                      <span className="sr-only">
                        {sheet.title}, {sheet.live ? "live" : "to come"}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="font-mono text-micro text-text-secondary">
                  {live} of {series.sheets.length} live
                </p>
              </div>
            </div>
          )}
          {series?.follow && (
            <div>
              <ButtonLink href={series.follow.href} variant="secondary">
                {series.follow.label}
              </ButtonLink>
            </div>
          )}
        </div>
        <div className="border-t border-line-muted">
          <div
            className={`${COLUMN} flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3 font-mono text-log text-text-body`}
          >
            {links.length > 0 && (
              <nav aria-label="Footer">
                <ul className="flex flex-wrap gap-x-5 gap-y-1">
                  {links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className={LINK}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <p className="text-text-secondary">
              Made by{" "}
              {credit.href ? (
                <a href={credit.href} className={`${LINK} text-text-body`}>
                  {credit.name}
                </a>
              ) : (
                credit.name
              )}{" "}
              · {credit.year}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
