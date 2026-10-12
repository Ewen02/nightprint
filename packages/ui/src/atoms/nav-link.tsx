export interface NavLinkProps {
  readonly href: string;
  readonly children: string;
}

/** A link of the site navigation: mono label, 44 px target. */
export function NavLink({ href, children }: NavLinkProps) {
  return (
    <a
      href={href}
      className="mono-label inline-flex min-h-11 items-center text-text-secondary transition-colors hover:text-text"
    >
      {children}
    </a>
  );
}
