import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'outline';

const variants: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-destructive text-destructive-foreground',
  outline: 'border border-input bg-background',
};

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}