import { MonoLabel } from "../atoms/mono-label";
import { FilterChips, type FilterOption } from "../molecules/filter-chips";

export interface ScenarioPickerProps {
  readonly scenarios: readonly FilterOption[];
  /** Id of the scenario on stage. */
  readonly value: string;
  readonly onChange?: (id: string) => void;
}

/** Which story the machine tells. Renders nothing for a machine with a single scenario. */
export function ScenarioPicker({ scenarios, value, onChange }: ScenarioPickerProps) {
  if (scenarios.length < 2) {
    return null;
  }
  return (
    <section aria-labelledby="scenario" className="flex flex-col gap-3">
      <MonoLabel as="h2" id="scenario">
        Scenario
      </MonoLabel>
      <FilterChips label="Scenario" options={scenarios} value={value} onChange={onChange} />
    </section>
  );
}
