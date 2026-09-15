import { useId, type ReactNode } from 'react';

import './Field.css';

type FieldProps = {
  label: string;
  hint?: string;
  /** Câu dẫn đặt ngoài <label> để tên trường vẫn gọn khi đọc bằng trình đọc màn hình. */
  description?: string;
  error?: string | undefined;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

export function Field({ label, hint, description, error, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label text-small" htmlFor={id}>
        {label}
        {hint ? <span className="field__hint"> — {hint}</span> : null}
      </label>
      {description ? (
        <p className="field__description text-caption" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {error ? (
        <p className="field__error text-small" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
