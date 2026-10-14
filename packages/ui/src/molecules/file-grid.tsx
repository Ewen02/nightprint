import { flow, neutral } from "@nightprint/tokens";

export interface FileGridProps {
  /** Files to read. */
  readonly total: number;
  /** Files read so far. */
  readonly done: number;
  /** What the grid shows, for whoever cannot see it. */
  readonly label: string;
}

const CELL = 8;
const GAP = 3;

/** One square per file to read, lit as each one is read: the survey before the sketch. */
export function FileGrid({ total, done, label }: FileGridProps) {
  // About 16:9, wider than tall, like the plate it stands for.
  const columns = Math.max(8, Math.ceil(Math.sqrt((total * 16) / 9)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const pitch = CELL + GAP;
  return (
    <div className="rounded-md border border-line bg-plate p-6">
      <svg
        viewBox={`0 0 ${columns * pitch - GAP} ${rows * pitch - GAP}`}
        role="img"
        aria-label={label}
        className="mx-auto block h-auto w-full max-w-[44rem]"
      >
        {Array.from({ length: total }, (_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: one square per file, in reading order.
            key={i}
            x={(i % columns) * pitch}
            y={Math.floor(i / columns) * pitch}
            width={CELL}
            height={CELL}
            rx={1}
            fill={i < done ? flow.request : neutral.lineStrong}
            fillOpacity={i < done ? 0.75 : 1}
            className="transition-[fill] duration-300"
          />
        ))}
      </svg>
    </div>
  );
}
