import type { ReactNode } from "react";

export interface HomeTemplateProps {
  readonly header: ReactNode;
  /** The opening section: the running machine and the story that drives it. */
  readonly story: ReactNode;
  /** The sections after it, each in a `PageSection`. */
  readonly children: ReactNode;
  readonly footer: ReactNode;
}

/** Layout of the home page, no data: the header, the story, the sections, the footer. */
export function HomeTemplate({ header, story, children, footer }: HomeTemplateProps) {
  return (
    <div id="top" className="flex min-h-dvh flex-col">
      {header}
      <main className="flex-1">
        {story}
        {children}
      </main>
      {footer}
    </div>
  );
}
