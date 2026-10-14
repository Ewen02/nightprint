export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  /** Id of the text that explains the field or reports on it. */
  readonly describedBy?: string;
  readonly disabled?: boolean;
}

/** A one-line text input under a mono label, on `plate`: an address, a name. */
export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  describedBy,
  disabled,
}: TextFieldProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={id} className="mono-label text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        aria-describedby={describedBy}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-md border border-line-strong bg-plate px-3 font-mono text-small text-text placeholder:text-text-faint hover:border-frame disabled:text-text-secondary"
      />
    </div>
  );
}
