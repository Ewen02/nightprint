import { Button } from "../atoms/button";

export interface StageActionProps {
  /** What the button does: "Unplug the adapters". */
  readonly label: string;
  /** What the stage shows once it is done, read out when it changes. */
  readonly note?: string | undefined;
  readonly onClick: () => void;
}

/** A way to look at the machine, in a corner of the stage, and what it shows now. */
export function StageAction({ label, note, onClick }: StageActionProps) {
  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" onClick={onClick}>
        {label}
      </Button>
      {/* There before it has anything to say, so a screen reader hears the change. */}
      <p role="status" className="max-w-60 text-right font-mono text-micro text-text-secondary">
        {note && (
          // Over the stage: a backing keeps it legible across lines and parts.
          <span className="inline-block rounded-xs border border-line bg-bg/85 px-3 py-2">
            {note}
          </span>
        )}
      </p>
    </div>
  );
}
