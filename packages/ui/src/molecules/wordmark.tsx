import { LogoMark } from "../atoms/logo-mark";

export interface WordmarkProps {
  /** Where the name leads: the top of the home page. */
  readonly href: string;
}

/** The site's name in a mono label, after the hexagon mark. */
export function Wordmark({ href }: WordmarkProps) {
  return (
    <a href={href} className="inline-flex min-h-11 items-center gap-2.5 text-text">
      <LogoMark />
      <span className="mono-label font-semibold">Nightprint</span>
    </a>
  );
}
