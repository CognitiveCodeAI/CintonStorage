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
        'text-gray-500 dark:text-gray-400',
        'bg-gray-100 dark:bg-gray-700',
        'border border-gray-300 dark:border-gray-600',
        'rounded',
        className
      )}
    >
      {children}
    </kbd>
  );
}

export { Kbd };
