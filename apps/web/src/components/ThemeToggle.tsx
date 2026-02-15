import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/Button';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return <Button variant="outline" size="icon" disabled />;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'light' ? (
        <Moon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
