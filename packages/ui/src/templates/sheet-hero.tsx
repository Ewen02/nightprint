import type { ReactNode, Ref } from "react";

export interface SheetHeroProps {
  /** Accessible name of the section. */
  readonly label: string;
  /** The drawing sheet, with its machine running. */
  readonly sheet: ReactNode;
  /** The title, the lead and the form: over the sheet's left margin from wide screens up. */
  readonly intro: ReactNode;
  /** What the machine plays now, low on the sheet's left margin. */
  readonly caption?: ReactNode;
  /** On phones, under the sheet: what its corner holds from wide screens up. */
  readonly aside?: ReactNode;
  /** The intro, for whoever measures the room it takes on the sheet. */
  readonly introRef?: Ref<HTMLDivElement>;
}

const MARGIN = "lg:left-[max(2.5rem,6.6vw)]";

/**
 * A first screen that is one drawing sheet, layout only. From wide screens up the sheet
 * fills the screen under the header and the intro sits on its left margin, the machine
 * framed beside it; on phones the intro comes first and the sheet follows. The intro
 * leads the reading order everywhere.
 */
export function SheetHero({ label, sheet, intro, caption, aside, introRef }: SheetHeroProps) {
  return (
    <section
      aria-label={label}
      className="relative flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-170 lg:max-h-250"
    >
      <div
        ref={introRef}
        className={`z-10 flex flex-col gap-7 px-4 pt-14 pb-8 sm:px-6 lg:absolute lg:inset-y-0 lg:w-[min(44%,40rem)] lg:justify-center lg:px-0 lg:py-22 ${MARGIN}`}
      >
        {intro}
      </div>
      <div className="relative h-[max(17.5rem,74vw)] lg:absolute lg:inset-0 lg:h-auto">{sheet}</div>
      {caption && (
        <div
          className={`z-10 px-4 pt-4 sm:px-6 lg:absolute lg:bottom-10 lg:max-w-104 lg:px-0 lg:pt-0 ${MARGIN}`}
        >
          {caption}
        </div>
      )}
      {aside && <div className="px-4 pt-4 pb-10 sm:px-6 lg:hidden">{aside}</div>}
    </section>
  );
}
