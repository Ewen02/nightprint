import { Easing, interpolate, useCurrentFrame } from "remotion";
import { neutral } from "../theme";

/** A cursor keyframe in page px: where it is at a frame, and how visible. */
export type CursorKey = readonly [frame: number, x: number, y: number, opacity: number];

export type Press = {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  /** Colour of the ring the click leaves: the flow colour of what the switch does. */
  readonly colour: string;
};

type CursorProps = {
  readonly path: readonly CursorKey[];
  readonly presses: readonly Press[];
};

const move = Easing.bezier(0.45, 0, 0.15, 1);
const RING_FRAMES = 18;

/** A pointer that travels to the switches and clicks them. Lives inside `Footage`, in page px. */
export function Cursor({ path, presses }: CursorProps) {
  const frame = useCurrentFrame();
  const frames = path.map((k) => k[0]);
  const at = (i: 1 | 2 | 3) =>
    interpolate(
      frame,
      frames,
      path.map((k) => k[i]),
      { easing: move, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  const pressed = presses.some((p) => frame >= p.frame - 2 && frame <= p.frame + 2);

  return (
    <>
      {presses.map((press) => {
        const age = frame - press.frame;
        if (age < 0 || age > RING_FRAMES) {
          return null;
        }
        const t = age / RING_FRAMES;
        return (
          <svg
            key={press.frame}
            aria-hidden="true"
            width={120}
            height={120}
            viewBox="-60 -60 120 120"
            style={{
              position: "absolute",
              left: press.x - 60,
              top: press.y - 60,
              overflow: "visible",
            }}
          >
            <circle
              r={interpolate(t, [0, 1], [8, 40], { easing: Easing.out(Easing.cubic) })}
              fill="none"
              stroke={press.colour}
              strokeWidth={3}
              opacity={interpolate(t, [0, 1], [1, 0])}
            />
            <circle
              r={6}
              fill={press.colour}
              opacity={interpolate(t, [0, 0.4], [0.9, 0], { extrapolateRight: "clamp" })}
            />
          </svg>
        );
      })}
      <svg
        aria-hidden="true"
        width={26}
        height={34}
        viewBox="-1 -1 20 29"
        style={{
          position: "absolute",
          left: at(1),
          top: at(2),
          opacity: at(3),
          scale: pressed ? 0.88 : 1,
          transformOrigin: "0 0",
          overflow: "visible",
        }}
      >
        <path
          d="M0 0 L0 23 L6.2 17.6 L10.4 27 L14.4 25.2 L10.3 16 L18 16 Z"
          fill={neutral.text}
          stroke={neutral.bg}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}
