import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm font-bold',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
        outline:
          'border border-slate-300 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-900',
        secondary:
          'bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
        ghost: 'hover:bg-emerald-50 hover:text-emerald-900',
        accent: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm font-bold',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base font-semibold',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
