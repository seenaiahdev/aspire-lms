import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn bg-error-600 text-white px-4 py-2.5 hover:bg-error-700 active:scale-[0.98] shadow-soft',
};

const sizeClasses: Record<string, string> = {
  xs: 'text-xs px-2.5 py-1.5',
  sm: 'text-sm px-3 py-2',
  md: 'text-sm',
  lg: 'text-base px-5 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  isLoading,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isCurrentlyLoading = loading || isLoading;

  return (
    <button
      className={cn(
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || isCurrentlyLoading}
      {...props}
    >
      {isCurrentlyLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isCurrentlyLoading && rightIcon}
    </button>
  );
}
