import { cx } from "../cx";

const variants = {
  primary: "bg-text font-semibold text-bg hover:bg-focus",
  secondary: "border border-line-strong bg-plate text-text hover:border-frame",
} as const;

export interface ButtonLinkProps {
  readonly href: string;
  readonly children: string;
  /** One primary per screen, like `Button`. */
  readonly variant?: keyof typeof variants;
}

/** A link drawn as a button, for actions that navigate. */
export function ButtonLink({ href, children, variant = "primary" }: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={cx(
        "mono-label inline-flex h-11 items-center rounded-md px-4.5 transition-colors",
        variants[variant],
      )}
    >
      {children}
    </a>
  );
}
