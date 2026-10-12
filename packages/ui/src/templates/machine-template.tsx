import type { ReactNode } from "react";

export interface MachineTemplateProps {
  readonly header: ReactNode;
  readonly title: string;
  readonly summary: string;
  /** Under the summary, over the stage: a link to the article. */
  readonly titleAside?: ReactNode;
  /** The 3D stage. It fills its box. */
  readonly stage: ReactNode;
  /** Ways to look at the machine: inset top right of the stage, under it on phones. */
  readonly tools?: ReactNode;
  /** Inset bottom right of the stage, hidden on phones. */
  readonly cartouche?: ReactNode;
  /** Inset bottom left of the stage, hidden on phones: the key to the colours. */
  readonly legend?: ReactNode;
  readonly transport: ReactNode;
  /** Right-hand column on desktop: "what if" switches, then the bill of parts. */
  readonly aside: ReactNode;
  readonly log: ReactNode;
  /** Full-width sections after the machine, each in a `PageSection`. */
  readonly after?: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * Layout of a machine page, no data. DOM order is the phone order
 * (title, stage, transport, log, aside); the grid rearranges it on desktop.
 */
export function MachineTemplate({
  header,
  title,
  summary,
  titleAside,
  stage,
  tools,
  cartouche,
  legend,
  transport,
  aside,
  log,
  after,
  footer,
}: MachineTemplateProps) {
  return (
    <div className="flex flex-col">
      {header}
      <main>
        {/* On desktop the machine fits the screen: the stage takes what the transport and the
          log leave, so the log is in view from the start. */}
        <div className="grid lg:h-[calc(100dvh-3.5rem)] lg:max-h-280 lg:min-h-160 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)_auto_auto]">
          <div className="relative flex flex-col border-b border-line-muted lg:col-start-1 lg:row-start-1 lg:border-r lg:border-b-0">
            <div className="pointer-events-none z-10 flex max-w-md flex-col gap-1.5 px-4 pt-4 lg:absolute lg:top-6 lg:left-6 lg:p-0">
              {/* The block lets drags through to the stage; its words can still be selected. */}
              <h1 className="pointer-events-auto self-start text-title">{title}</h1>
              <p className="pointer-events-auto text-small text-text-muted">{summary}</p>
              {titleAside && <div className="pointer-events-auto">{titleAside}</div>}
            </div>
            <div className="relative h-[44dvh] min-h-[280px] lg:h-auto lg:flex-1">
              <div className="absolute inset-0">{stage}</div>
              {tools && <div className="absolute top-4 right-4 z-10 hidden sm:block">{tools}</div>}
            </div>
            {/* On phones the stage is too small to write over: its tools follow it. */}
            {tools && <div className="px-4 pb-4 sm:hidden">{tools}</div>}
            {cartouche && (
              <div className="absolute right-4 bottom-4 z-10 hidden sm:block">{cartouche}</div>
            )}
            {legend && (
              <div className="absolute bottom-4 left-4 z-10 hidden max-w-sm sm:block">{legend}</div>
            )}
          </div>
          <div className="lg:col-span-2 lg:row-start-2">{transport}</div>
          {/* On phones the log follows the transport, before the switches. */}
          <div className="lg:col-span-2 lg:row-start-3">{log}</div>
          <aside className="flex flex-col gap-8 p-4 sm:p-6 lg:col-start-2 lg:row-start-1 lg:overflow-y-auto">
            {/* On phones the stage has no room for the legend: it opens the column instead. */}
            {legend && <div className="sm:hidden">{legend}</div>}
            {aside}
          </aside>
        </div>
        {after}
      </main>
      {footer}
    </div>
  );
}
