import { FlowDot } from "../atoms/flow-dot";
import { Wordmark } from "../molecules/wordmark";

export interface HomeHeaderProps {
  /** Target of the wordmark: the top of the page. */
  readonly homeHref: string;
  /** In-page sections, in page order. */
  readonly links: readonly { readonly label: string; readonly href: string }[];
  /** What runs on the page, in the request colour, from wide screens up. */
  readonly status?: { readonly label: string; readonly href: string };
}

const CELL = "mono-label flex min-h-11 items-center px-4";

/**
 * The home page bar, ruled like the top border of a drawing sheet: the name in the
 * first cell, the sections in the next ones. The sheet below starts at the same edge.
 */
export function HomeHeader({ homeHref, links, status }: HomeHeaderProps) {
  return (
    <header className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="flex flex-wrap border border-line-strong">
        <div className="flex items-center border-line-strong px-4 max-sm:w-full max-sm:border-b sm:border-r">
          <Wordmark href={homeHref} />
        </div>
        <nav aria-label="Main" className="flex flex-1 sm:justify-end">
          <ul className="flex flex-1 sm:flex-none">
            {links.map((link, index) => (
              <li
                key={link.href}
                // Four sections side by side fit a 320 px screen; a fifth shows from sm up.
                className={`flex flex-1 border-line-muted not-first:border-l sm:flex-none sm:border-l ${index >= 4 ? "max-sm:hidden" : ""}`}
              >
                {/* Narrower on phones: four sections side by side still fit a 320 px screen. */}
                <a
                  href={link.href}
                  className={`${CELL} w-full justify-center text-text-secondary transition-colors hover:bg-surface hover:text-text max-sm:px-2`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {status && (
          <a
            href={status.href}
            className={`${CELL} hidden gap-2.5 border-l border-line-strong text-flow-request transition-colors hover:bg-surface lg:flex`}
          >
            <FlowDot flow="request" />
            {status.label}
          </a>
        )}
      </div>
    </header>
  );
}
