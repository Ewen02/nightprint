import { Fragment } from "react";
import { cx } from "../cx";

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

/** Where you are: NIGHTPRINT / MCH-001. The last item is the current page. */
export function Breadcrumb({ items }: { readonly items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mono-label flex items-center gap-2.5">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <Fragment key={item.label}>
            {index > 0 && (
              <span aria-hidden="true" className="text-text-faint">
                /
              </span>
            )}
            {item.href && !last ? (
              <a href={item.href} className="font-semibold text-text">
                {item.label}
              </a>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={cx(last ? "text-text-secondary" : "font-semibold text-text")}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
