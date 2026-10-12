import type { FlowName } from "@nightprint/tokens";
import { MonoLabel } from "../atoms/mono-label";
import { PartRow } from "../molecules/part-row";

export interface BillOfPartsItem {
  readonly id: string;
  readonly number: number;
  readonly label: string;
  readonly role?: string | undefined;
  /** Flow of the current step when the part is lit, else null. */
  readonly flow: FlowName | null;
  readonly violation: boolean;
}

export interface BillOfPartsProps {
  /** Rows in display order (by number). */
  readonly items: readonly BillOfPartsItem[];
  readonly selectedId: string | null;
  /** Part under the pointer or the focus, in the list or in the scene. */
  readonly hoveredId?: string | null;
  readonly onSelect?: (id: string | null) => void;
  readonly onHover?: (id: string | null) => void;
  /** One line under the heading: how the list relates to the drawing. */
  readonly description?: string;
  /** Description of the selected part, shown under the list. */
  readonly inspected?: { readonly label: string; readonly description: string } | null;
}

/** The numbered parts list of an assembly drawing, linked to the balloons in the scene. */
export function BillOfParts({
  items,
  selectedId,
  hoveredId = null,
  onSelect,
  onHover,
  description,
  inspected,
}: BillOfPartsProps) {
  return (
    <section aria-labelledby="bill-of-parts" className="flex flex-col gap-3">
      <MonoLabel as="h2" id="bill-of-parts">
        Bill of parts · {items.length}
      </MonoLabel>
      {description && <p className="text-small text-text-muted">{description}</p>}
      <ol className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <PartRow
              number={item.number}
              label={item.label}
              role={item.role}
              flow={item.flow}
              violation={item.violation}
              selected={item.id === selectedId}
              hovered={item.id === hoveredId}
              onSelect={() => onSelect?.(item.id === selectedId ? null : item.id)}
              onHover={(hovered) => onHover?.(hovered ? item.id : null)}
            />
          </li>
        ))}
      </ol>
      {inspected && (
        <p className="rounded-xs border border-line bg-inset px-3 py-2 text-small text-text-muted">
          <span className="text-text">{inspected.label}.</span> {inspected.description}
        </p>
      )}
    </section>
  );
}
