import { flow as flowColour, neutral } from "@nightprint/tokens";
import { Toggle } from "../atoms/toggle";

export interface WhatIfSwitchProps {
  /** Named like a test case: "Swap Postgres for InMemory". */
  readonly label: string;
  readonly description: string;
  readonly on: boolean;
  /** `violation` for a counter-example that breaks the pattern. */
  readonly tone?: "safe" | "violation";
  readonly onToggle?: (on: boolean) => void;
}

/** An accessible switch that changes the machine. */
export function WhatIfSwitch({
  label,
  description,
  on,
  tone = "safe",
  onToggle,
}: WhatIfSwitchProps) {
  const colour = tone === "violation" ? flowColour.error : flowColour.write;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onToggle?.(!on)}
      className="flex min-h-12 w-full items-start gap-3 rounded-md border bg-plate px-3 py-2.5 text-left transition-colors"
      style={{ borderColor: on ? colour : neutral.lineStrong }}
    >
      <span className="mt-0.5 flex-none">
        <Toggle on={on} tone={tone} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-small font-semibold">{label}</span>
        <span className="text-small text-text-muted">{description}</span>
      </span>
    </button>
  );
}
