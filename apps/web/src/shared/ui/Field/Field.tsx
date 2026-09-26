import { useId, type ReactNode } from 'react';

import './Field.css';

type FieldProps = {
  label: string;
  hint?: string | undefined;
  /** Câu dẫn đặt ngoài <label> để tên trường vẫn gọn khi đọc bằng trình đọc màn hình. */
  description?: string | undefined;
  /** Nội dung phụ nằm cùng hàng với nhãn, bên phải — ví dụ bộ đếm ký tự. */
  aside?: ReactNode;
  error?: string | undefined;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

export function Field({ label, hint, description, aside, error, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  const labelNode = (
    <label className="field__label text-small" htmlFor={id}>
      {label}
      {hint ? <span className="field__hint"> — {hint}</span> : null}
    </label>
  );

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      {aside ? (
        <div className="field__header">
          {labelNode}
          {aside}
        </div>
      ) : (
        labelNode
      )}
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
