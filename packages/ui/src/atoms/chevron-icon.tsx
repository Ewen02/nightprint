const paths = {
  left: "M10 3L5 8L10 13",
  right: "M6 3L11 8L6 13",
  up: "M4 10L8 6L12 10",
  down: "M4 6L8 10L12 6",
} as const;

export interface ChevronIconProps {
  readonly direction: keyof typeof paths;
  readonly className?: string;
}

/** The only icon of the system: 16 px, 1.6 stroke, round caps, current colour. */
export function ChevronIcon({ direction, className }: ChevronIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d={paths[direction]}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
