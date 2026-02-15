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
        container: 'bg-success-muted border-success/30',
        icon: 'text-success',
        title: 'text-success-foreground',
        content: 'text-success-foreground',
      },
      warning: {
        container: 'bg-warning-muted border-warning/30',
        icon: 'text-warning',
        title: 'text-warning-foreground',
        content: 'text-warning-foreground',
      },
      error: {
        container: 'bg-danger-muted border-danger/30',
        icon: 'text-danger',
        title: 'text-danger-foreground',
        content: 'text-danger-foreground',
      },
      info: {
        container: 'bg-info-muted border-info/30',
        icon: 'text-info',
        title: 'text-info-foreground',
        content: 'text-info-foreground',
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
            className={cn('flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10', styles.icon)}
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
