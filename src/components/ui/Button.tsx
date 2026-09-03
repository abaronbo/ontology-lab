import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'label';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = 'secondary', className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={`btn btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
