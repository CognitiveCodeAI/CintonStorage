import { cn } from '../../lib/utils';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center h-5 min-w-5 px-1.5',
        'text-xs font-mono font-medium',
        'text-muted-foreground',
        'bg-surface-muted',
        'border border-border',
        'rounded',
        className
      )}
    >
      {children}
    </kbd>
  );
}

export { Kbd };
