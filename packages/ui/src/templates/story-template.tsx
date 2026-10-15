import type { ReactNode, Ref } from "react";
import { cx } from "../cx";

export interface StoryBeat {
  readonly key: string;
  readonly content: ReactNode;
  /**
   * `opening` fills the first screen and holds the wide text of a hero; `intro` is a
   * shorter beat that says what the steps are about; `note` is one step's room.
   */
  readonly size?: "opening" | "intro" | "note";
}

export interface StoryTemplateProps {
  /** Anchor of the section. */
  readonly id: string;
  /** Accessible name of the section. */
  readonly label: string;
  /** What stays in view while the beats scroll past: the drawing sheet. */
  readonly sheet: ReactNode;
  /**
   * From wide screens up, laid over the sheet's top edge and above the beats, so the
   * text scrolls under it: the sheet's `StepRuler`. Phones keep it in the sheet.
   */
  readonly ruler?: ReactNode;
  /** Beats before the steps: the opening, then what the steps are about. */
  readonly before: readonly StoryBeat[];
  /** The steps, in order: read as an ordered list. */
  readonly steps: readonly StoryBeat[];
  readonly after?: readonly StoryBeat[];
  /** The column of beats, for whoever measures it or watches which beat is read. */
  readonly columnRef?: Ref<HTMLDivElement>;
}

const SIZES = {
  opening: "py-10 lg:min-h-dvh lg:max-w-160 lg:py-24",
  intro: "pt-10 pb-6 lg:min-h-[70dvh] lg:max-w-110 lg:py-12",
  note: "min-h-[56dvh] pt-10 pb-6 lg:min-h-[88dvh] lg:max-w-110 lg:py-12",
} as const;

// Phones read a beat from its top, just under the sheet; wide screens centre it.
const beatClass = (size: StoryBeat["size"]) =>
  cx("pointer-events-auto flex flex-col lg:justify-center", SIZES[size ?? "note"]);

/**
 * A story told over a figure that stays put, no data. From wide screens up, the sheet
 * fills the screen behind and the beats scroll past along its left margin; on phones it
 * holds the top of the screen and the beats scroll up under it. Every beat, before,
 * step or after, is a `[data-beat]` element, numbered in order.
 */
export function StoryTemplate({
  id,
  label,
  sheet,
  ruler,
  before,
  steps,
  after = [],
  columnRef,
}: StoryTemplateProps) {
  return (
    <section id={id} aria-label={label} className="relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto sticky top-0 z-20 h-[min(40dvh,72vw)] border-b border-line-muted lg:z-0 lg:h-dvh lg:border-b-0">
          {sheet}
        </div>
      </div>
      {/* Transparent to the pointer except over the beats: the stage takes drags beside them. */}
      <div className="pointer-events-none relative z-10">
        <div className="mx-auto max-w-300 px-4 sm:px-6">
          <div ref={columnRef} className="flex flex-col pt-[min(40dvh,72vw)] lg:pt-0">
            {before.map((beat, index) => (
              <div key={beat.key} data-beat={index} className={beatClass(beat.size)}>
                {beat.content}
              </div>
            ))}
            <ol className="flex flex-col">
              {steps.map((beat, index) => (
                <li
                  key={beat.key}
                  data-beat={before.length + index}
                  className={beatClass(beat.size)}
                >
                  {beat.content}
                </li>
              ))}
            </ol>
            {after.map((beat, index) => (
              <div
                key={beat.key}
                data-beat={before.length + steps.length + index}
                className={beatClass(beat.size)}
              >
                {beat.content}
              </div>
            ))}
          </div>
        </div>
      </div>
      {ruler && (
        // Above the beats, so the text scrolls under it, in a layer as tall as the section
        // like the sheet's: it rides the top of the screen as long as the sheet does, then
        // leaves with it. It sits inside the sheet's frame (12 px in, plus its 1 px border).
        <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
          <div className="sticky top-0 h-dvh">
            <div className="absolute inset-x-[13px] top-[13px]">{ruler}</div>
          </div>
        </div>
      )}
    </section>
  );
}
