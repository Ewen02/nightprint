import type { FlowName } from "@nightprint/tokens";
import { Arrowhead } from "../atoms/arrowhead";
import { FlowDot } from "../atoms/flow-dot";

export interface FlowLegendProps {
  /** What each flow colour means in this machine, in the order to read them. */
  readonly items: readonly { readonly flow: FlowName; readonly label: string }[];
  /** What an arrowhead on a pipe means: "Depends on". */
  readonly dependency?: string;
  /** How to handle the scene: "Click a part · drag to turn". */
  readonly hint?: string;
}

/** The key to the drawing: its colours, its arrowheads, and how to handle it. */
export function FlowLegend({ items, dependency, hint }: FlowLegendProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xs border border-line bg-bg/85 px-3 py-2">
      <ul aria-label="Flow colours" className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <li
            key={item.flow}
            className="flex items-center gap-1.5 font-mono text-micro text-text-secondary uppercase"
          >
            <FlowDot flow={item.flow} />
            {item.label}
          </li>
        ))}
        {dependency && (
          <li className="flex items-center gap-1.5 font-mono text-micro text-text-secondary uppercase">
            <Arrowhead className="text-text-body" />
            {dependency}
          </li>
        )}
      </ul>
      {hint && <p className="font-mono text-micro text-text-faint">{hint}</p>}
    </div>
  );
}
