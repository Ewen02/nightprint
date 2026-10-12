import { FilterChip } from "../atoms/filter-chip";

export interface FilterOption {
  readonly id: string;
  readonly label: string;
}

export interface FilterChipsProps {
  /** Accessible name of the group: "Filter by family". */
  readonly label: string;
  readonly options: readonly FilterOption[];
  /** Id of the pressed option. */
  readonly value: string;
  readonly onChange?: (id: string) => void;
}

/** A row of filter chips, one pressed at a time. */
export function FilterChips({ label, options, value, onChange }: FilterChipsProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of toggle buttons, not form fields: no fieldset.
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <FilterChip
          key={option.id}
          pressed={option.id === value}
          onClick={() => onChange?.(option.id)}
        >
          {option.label}
        </FilterChip>
      ))}
    </div>
  );
}
