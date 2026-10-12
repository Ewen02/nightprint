import { Button } from "../atoms/button";
import { MonoLabel } from "../atoms/mono-label";

export interface ScenarioEndProps {
  /** How many steps were played. */
  readonly count: number;
  /** "Done in 184.34 ms". */
  readonly title: string;
  /** The last thing the machine logged: "201 Created  order#1042". */
  readonly result: string;
  /** What to try next: a switch not flipped yet, another scenario. */
  readonly suggestions: readonly { readonly id: string; readonly label: string }[];
  readonly onSuggestion?: (id: string) => void;
}

/**
 * The end of a scenario, in place of the last step's caption: that it is over,
 * what came out, and one thing to change next. Read aloud when it appears.
 */
export function ScenarioEnd({ count, title, result, suggestions, onSuggestion }: ScenarioEndProps) {
  return (
    <div aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-1">
      <MonoLabel tone="text">Done · {count} steps</MonoLabel>
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-heading">{title}</span>
        <span className="font-mono text-log text-text-body">{result}</span>
      </p>
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5">
          <p className="text-small text-text-muted">Now change one thing:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="secondary"
                onClick={() => onSuggestion?.(suggestion.id)}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
