import type { ReactNode } from "react";

export interface IconButtonProps {
  /** Accessible name, required: the button shows an icon only. */
  readonly label: string;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}

/** 44 px square control with an icon in `text` on `plate`. */
export function IconButton({ label, children, disabled = false, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-md border border-line-strong bg-plate text-text transition-colors hover:border-frame disabled:text-text-faint disabled:hover:border-line-strong"
    >
      {children}
    </button>
  );
}
