import { LogoMark } from "../atoms/logo-mark";
import { MonoLabel } from "../atoms/mono-label";
import { Breadcrumb, type BreadcrumbItem } from "../molecules/breadcrumb";

export interface SiteHeaderProps {
  readonly breadcrumb: readonly BreadcrumbItem[];
  /** Right-hand context, e.g. "backend · PATTERN". Hidden on phones. */
  readonly meta?: string;
}

/** The 56 px bar at the top of a machine page; the home page has its own, `HomeHeader`. */
export function SiteHeader({ breadcrumb, meta }: SiteHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line-muted px-4 sm:px-6">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <Breadcrumb items={breadcrumb} />
      </div>
      {meta && <MonoLabel className="hidden sm:block">{meta}</MonoLabel>}
    </header>
  );
}
