import type { ButtonHTMLAttributes } from 'react';

import './Button.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
};

export function Button({ variant = 'secondary', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`btn btn--${variant}`} {...rest} />;
}
