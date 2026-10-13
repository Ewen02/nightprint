import { type FlowName, flow as flowColour } from "@nightprint/tokens";
import { Balloon } from "../atoms/balloon";
import { cx } from "../cx";

export interface PartCalloutProps {
  readonly number: number;
  readonly label: string;
  readonly role?: string | undefined;
  readonly description?: string | undefined;
  /** Flow of the current step when the part is lit. */
  readonly flow?: FlowName | null;
  readonly violation?: boolean;
  /** What the part is doing in this step, under its name: "Microtasks". */
  readonly status?: string | undefined;
  /** What the callout says: its number only, its name too, or name, role and description. */
  readonly detail: "number" | "name" | "full";
}

/**
 * A part's balloon in the drawing, saying as much as the moment needs. The
 * balloon's centre sits on the anchor point and the text opens to its right, or
 * to its left inside an ancestor marked `data-side="left"` (the right of the stage).
 */
export function PartCallout({
  number,
  label,
  role,
  description,
  flow = null,
  violation = false,
  status,
  detail,
}: PartCalloutProps) {
  const accent = violation ? flowColour.error : flow ? flowColour[flow] : null;
  const open = detail !== "number";
  return (
    // -11px: half the 22 px balloon, so its centre lands on the anchor.
    <div className="-mt-[11px] -ml-[11px] flex items-start gap-1.5 [[data-side=left]_&]:ml-[11px] [[data-side=left]_&]:-translate-x-full [[data-side=left]_&]:flex-row-reverse">
      <Balloon number={number} flow={flow} violation={violation} />
      <div
        className={cx(
          "overflow-hidden rounded-xs border bg-bg/90 transition-[opacity,max-width] duration-200 ease-machine motion-reduce:transition-none",
          open ? "max-w-60 opacity-100" : "max-w-0 border-transparent opacity-0",
          !accent && "border-line",
        )}
        style={accent && open ? { borderColor: accent } : undefined}
      >
        <div className="flex w-max max-w-60 flex-col gap-0.5 px-2 py-1">
          <p className="font-mono text-log whitespace-nowrap text-text">{label}</p>
          {status && (
            <p
              className="font-mono text-micro whitespace-nowrap text-text-secondary"
              style={accent ? { color: accent } : undefined}
            >
              {status}
            </p>
          )}
          {detail === "full" && role && (
            <p className="font-mono text-micro text-text-secondary">{role}</p>
          )}
          {detail === "full" && description && (
            <p className="mt-1 w-52 text-small text-text-muted">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
