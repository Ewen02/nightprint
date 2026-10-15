import type { ReactNode } from "react";
import { cx } from "../cx";

const variants = {
  primary: "min-w-24 bg-text text-bg hover:bg-focus",
  secondary: "border border-line-strong bg-plate text-text hover:border-frame",
} as const;

export interface ButtonProps {
  readonly children: ReactNode;
  /** For toggle buttons such as Play / Pause. */
  readonly pressed?: boolean;
  /** One primary per screen: `text` fill, `bg` mono label. */
  readonly variant?: keyof typeof variants;
  /** `submit` sends the form it sits in. */
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  /** Work under way, 0 to 1: a rule fills along the button's foot as it goes. */
  readonly progress?: number | undefined;
}

/** An action in a mono label: primary (one per screen) or secondary, on `plate`. */
export function Button({
  children,
  pressed,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  progress,
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "mono-label relative h-11 overflow-hidden rounded-md px-4 transition-colors disabled:opacity-60",
        variants[variant],
      )}
    >
      {children}
      {progress !== undefined && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-flow-request transition-transform duration-200 ease-machine motion-reduce:transition-none"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
        />
      )}
    </button>
  );
}
