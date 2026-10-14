import type { FormEvent } from "react";
import { Button } from "../atoms/button";
import { TextField } from "../atoms/text-field";

export interface RepoFormProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  /** A drawing is under way: the form waits. */
  readonly busy?: boolean;
  readonly label: string;
  readonly placeholder: string;
  readonly action: string;
  /** Id of the line that reports on the drawing. */
  readonly describedBy?: string;
}

/** The address of a repository and the button that draws it. */
export function RepoForm({
  value,
  onChange,
  onSubmit,
  busy,
  label,
  placeholder,
  action,
  describedBy,
}: RepoFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && value.trim() !== "") {
      onSubmit();
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <TextField
        id="repo"
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        describedBy={describedBy}
        disabled={busy}
      />
      <Button type="submit" disabled={busy || value.trim() === ""}>
        {action}
      </Button>
    </form>
  );
}
