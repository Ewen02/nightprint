import type { FlowName } from "@nightprint/tokens";
import { Balloon } from "../atoms/balloon";
import { cx } from "../cx";

export interface PartRowProps {
  readonly number: number;
  readonly label: string;
  /** Short role: DRIVING, DRIVEN PORT, CORE… */
  readonly role?: string | undefined;
  /** Flow of the current step when the part is lit. */
  readonly flow?: FlowName | null;
  readonly violation?: boolean;
  readonly selected?: boolean;
  /** The pointer or the keyboard focus is on the part, here or in the scene. */
  readonly hovered?: boolean;
  readonly onSelect?: () => void;
  readonly onHover?: (hovered: boolean) => void;
}

/**
 * One line of the bill of parts: balloon, name, role. Pressing it selects the part;
 * pointing at it, or focusing it, shows the part in the scene.
 */
export function PartRow({
  number,
  label,
  role,
  flow = null,
  violation = false,
  selected = false,
  hovered = false,
  onSelect,
  onHover,
}: PartRowProps) {
  const highlighted = selected || hovered || flow !== null;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={cx(
        "flex w-full items-center gap-3 rounded-xs border px-2 py-1.5 text-left font-mono text-log transition-colors",
        highlighted ? "border-frame bg-text/6" : "border-transparent hover:bg-text/4",
      )}
    >
      <Balloon number={number} flow={flow} violation={violation} size="sm" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {role && <span className="text-micro text-text-secondary">{role}</span>}
    </button>
  );
}
