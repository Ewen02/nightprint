import { cx } from "../cx";

export interface NextSheetProps {
  /** What the block stands for: "Next on the board". */
  readonly heading: string;
  /** The repository as it is typed; empty until there is one. */
  readonly title: string;
  /** What stands in the title until something is typed: "owner/name". */
  readonly placeholder: string;
  /** The cells under the title: code, scale, who checked it. */
  readonly cells: readonly { readonly term: string; readonly value: string }[];
}

const cell = "px-2.5 py-1.5";

/**
 * The title block of the next sheet on the board, beside the cartouche of the one that
 * runs: it letters the repository a visitor is about to draw, one character at a time.
 */
export function NextSheet({ heading, title, placeholder, cells }: NextSheetProps) {
  return (
    <div className="w-64 border border-frame bg-bg/85 font-mono text-micro tracking-[0.08em] text-text-body">
      <p className={cx(cell, "border-b border-frame text-text-faint uppercase")}>{heading}</p>
      <p
        className={cx(
          cell,
          "min-h-8 overflow-hidden border-b border-frame text-small font-semibold tracking-normal break-all",
          title === "" ? "text-text-faint" : "text-text",
        )}
      >
        {title === ""
          ? placeholder
          : // Keyed by place and character: only what was just typed comes in.
            [...title].map((character, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a character's place is its identity here.
                key={`${index}-${character}`}
                className="inline-block animate-enter motion-reduce:animate-none"
              >
                {character}
              </span>
            ))}
      </p>
      <dl
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((item, index) => (
          <div key={item.term} className={cx(cell, index > 0 && "border-l border-frame")}>
            <dt className="text-text-faint uppercase">{item.term}</dt>
            <dd className="uppercase">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
