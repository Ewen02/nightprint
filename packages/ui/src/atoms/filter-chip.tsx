import { cx } from "../cx";

export interface FilterChipProps {
  readonly children: string;
  readonly pressed: boolean;
  readonly onClick?: () => void;
}

/** A toggle button that narrows a list. Pressed in `raised`, at rest on `plate`. */
export function FilterChip({ children, pressed, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        "mono-label h-11 rounded-md border px-3.5 transition-colors",
        pressed
          ? "border-frame bg-raised text-text"
          : "border-line-strong bg-plate text-text-secondary hover:border-frame hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
