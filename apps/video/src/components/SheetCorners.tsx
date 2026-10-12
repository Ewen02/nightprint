import { interpolate, useCurrentFrame } from "remotion";
import { neutral } from "../theme";
import { clamp, settle } from "./motion";

type SheetCornersProps = {
  readonly at: number;
  readonly out?: number;
  readonly inset?: number;
};

const ARM = 40;

/** Crop marks at the four corners of the frame, as on a drawing sheet. */
export function SheetCorners({ at, out, inset = 40 }: SheetCornersProps) {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [at, at + 16], [0, ARM], { ...clamp, easing: settle });
  const fade = out === undefined ? 1 : interpolate(frame, [out, out + 10], [1, 0], clamp);
  const corners = [
    { left: inset, top: inset, sx: 1, sy: 1 },
    { right: inset, top: inset, sx: -1, sy: 1 },
    { left: inset, bottom: inset, sx: 1, sy: -1 },
    { right: inset, bottom: inset, sx: -1, sy: -1 },
  ] as const;
  return (
    <>
      {corners.map(({ sx, sy, ...position }) => (
        <svg
          key={`${sx}${sy}`}
          aria-hidden="true"
          width={ARM}
          height={ARM}
          viewBox={`0 0 ${ARM} ${ARM}`}
          style={{ position: "absolute", ...position, opacity: fade, scale: `${sx} ${sy}` }}
        >
          <path
            d={`M0 ${draw} L0 0 L${draw} 0`}
            fill="none"
            stroke={neutral.textFaint}
            strokeWidth={2}
          />
        </svg>
      ))}
    </>
  );
}
