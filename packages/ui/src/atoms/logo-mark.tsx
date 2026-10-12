import { flow, neutral } from "@nightprint/tokens";

export interface LogoMarkProps {
  /** Side in px. */
  readonly size?: number;
}

/** The hexagon and its request dot, as in the favicon. Decorative: the wordmark names the site. */
export function LogoMark({ size = 22 }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="flex-none">
      <polygon
        points="16,5 25.5,10.5 25.5,21.5 16,27 6.5,21.5 6.5,10.5"
        fill="none"
        stroke={neutral.textBody}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.2" fill={flow.request} />
    </svg>
  );
}
