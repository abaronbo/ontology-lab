import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  plain?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label-above-control wrapper used by the panel and the settings dialog. */
export function Field({ label, htmlFor, plain, className = '', children }: FieldProps) {
  return (
    <div className={`field ${className}`.trim()}>
      <label className={`field__label ${plain ? 'field__label--plain' : ''}`.trim()} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  rows?: number;
  prefix?: string;
}

/** Single-line input, or a textarea when `rows` is given. Optional static `prefix:` label (for IRIs). */
export function TextField({ id, label, value, onChange, placeholder, mono, rows, prefix }: TextFieldProps) {
  const control = rows ? (
    <textarea
      id={id}
      className={`textarea ${mono ? 'textarea--mono' : ''}`.trim()}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      id={id}
      className={`input ${mono ? 'input--mono' : ''}`.trim()}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return (
    <Field label={label} htmlFor={id}>
      {prefix !== undefined ? (
        <div className="field__row">
          <span className="field__prefix">{prefix}:</span>
          {control}
        </div>
      ) : (
        control
      )}
    </Field>
  );
}
