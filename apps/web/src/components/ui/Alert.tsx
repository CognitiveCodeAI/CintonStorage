import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  onDismiss?: () => void;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, children, onDismiss, ...props }, ref) => {
    const variants = {
      success: {
        container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        icon: 'text-green-500',
        title: 'text-green-800 dark:text-green-200',
        content: 'text-green-700 dark:text-green-300',
      },
      warning: {
        container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        icon: 'text-amber-500',
        title: 'text-amber-800 dark:text-amber-200',
        content: 'text-amber-700 dark:text-amber-300',
      },
      error: {
        container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        icon: 'text-red-500',
        title: 'text-red-800 dark:text-red-200',
        content: 'text-red-700 dark:text-red-300',
      },
      info: {
        container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        icon: 'text-blue-500',
        title: 'text-blue-800 dark:text-blue-200',
        content: 'text-blue-700 dark:text-blue-300',
      },
    };

    const icons = {
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle,
      info: Info,
    };

    const Icon = icons[variant];
    const styles = variants[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative rounded-lg border p-4 flex items-start gap-3',
          styles.container,
          className
        )}
        {...props}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={cn('font-medium', styles.title)}>{title}</h3>
          )}
          {children && (
            <div className={cn('text-sm', title && 'mt-1', styles.content)}>
              {children}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn('flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5', styles.icon)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };
