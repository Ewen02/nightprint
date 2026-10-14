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
}

/** An action in a mono label: primary (one per screen) or secondary, on `plate`. */
export function Button({
  children,
  pressed,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "mono-label h-11 rounded-md px-4 transition-colors disabled:opacity-60",
        variants[variant],
      )}
    >
      {children}
    </button>
  );
}
