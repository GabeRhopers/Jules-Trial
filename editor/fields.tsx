// Small form controls used across the editor.
import type { ReactNode } from "react";

type Base = { label: string; hint?: string };

export const Field: React.FC<Base & { children: ReactNode }> = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

export const Text: React.FC<Base & { value: string | undefined; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number; mono?: boolean }> = ({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  mono,
}) => (
  <Field label={label} hint={hint}>
    {multiline ? (
      <textarea className={mono ? "mono" : undefined} rows={rows} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input type="text" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    )}
  </Field>
);

export const Num: React.FC<Base & { value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number }> = ({ label, hint, value, onChange, min, max, step }) => (
  <Field label={label} hint={hint}>
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  </Field>
);

export const Check: React.FC<{ label: string; value: boolean | undefined; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <label className="check">
    <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

export const Select: React.FC<Base & { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({ label, hint, value, options, onChange }) => (
  <Field label={label} hint={hint}>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Field>
);

/** Empty text becomes "not set", so optional fields disappear from config.json instead of saving "". */
export const opt = (v: string) => (v.trim() === "" ? undefined : v);
