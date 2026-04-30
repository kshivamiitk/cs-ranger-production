'use client';

import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'premium';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'button',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
  danger: 'button button-danger',
  premium: 'button button-premium',
};

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button className={cn(variantClassName[variant], className)} {...props}>
      {children}
    </button>
  );
}


