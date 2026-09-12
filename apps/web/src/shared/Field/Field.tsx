import { useId, type ReactNode } from 'react';

import './Field.css';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label text-small" htmlFor={id}>
        {label}
        {hint ? <span className="field__hint"> — {hint}</span> : null}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error ? (
        <p className="field__error text-small" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
