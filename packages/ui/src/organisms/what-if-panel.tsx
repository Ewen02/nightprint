import { MonoLabel } from "../atoms/mono-label";
import { WhatIfSwitch } from "../molecules/what-if-switch";

export interface WhatIfItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tone: "safe" | "violation";
  readonly on: boolean;
}

export interface WhatIfPanelProps {
  readonly actions: readonly WhatIfItem[];
  readonly onToggle?: (id: string, on: boolean) => void;
  /** One line under the heading: what a switch does. */
  readonly description?: string;
}

/** The machine's "what if…" switches. Renders nothing for a machine without actions. */
export function WhatIfPanel({ actions, onToggle, description }: WhatIfPanelProps) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="what-if" className="flex flex-col gap-3">
      <MonoLabel as="h2" id="what-if">
        What if…
      </MonoLabel>
      {description && <p className="text-small text-text-muted">{description}</p>}
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <WhatIfSwitch
            key={action.id}
            label={action.label}
            description={action.description}
            on={action.on}
            tone={action.tone}
            onToggle={(on) => onToggle?.(action.id, on)}
          />
        ))}
      </div>
    </section>
  );
}
