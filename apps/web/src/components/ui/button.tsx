import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
        outline: 'border-input bg-surface text-foreground hover:border-ring/50 hover:bg-surface-muted active:scale-[0.98]',
        ghost: 'border-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground active:scale-[0.98]',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
