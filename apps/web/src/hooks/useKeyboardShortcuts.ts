import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type KeyHandler = () => void;
type ShortcutMap = Record<string, KeyHandler>;

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onSearchOpen?: () => void;
  onHelpOpen?: () => void;
}

// Vim-style two-key navigation state
let pendingKey: string | null = null;
let pendingTimeout: NodeJS.Timeout | null = null;

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true, onSearchOpen, onHelpOpen } = options;
  const navigate = useNavigate();

  const isInputElement = useCallback((target: EventTarget | null): boolean => {
    if (!target) return false;
    const element = target as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.isContentEditable
    );
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs (except for specific ones)
      const inInput = isInputElement(event.target);

      // Cmd/Ctrl + K for search (works everywhere)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onSearchOpen?.();
        return;
      }

      // Escape - close modals, clear search (works everywhere)
      if (event.key === 'Escape') {
        // Let modal handlers handle this naturally
        return;
      }

      // Skip remaining shortcuts if in input
      if (inInput) return;

      // / for search
      if (event.key === '/') {
        event.preventDefault();
        onSearchOpen?.();
        return;
      }

      // ? for help
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        onHelpOpen?.();
        return;
      }

      // N for new intake
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        navigate('/intake/new');
        return;
      }

      // G + key navigation (vim-style)
      if (event.key === 'g' && !pendingKey) {
        pendingKey = 'g';
        // Clear after 1 second
        if (pendingTimeout) clearTimeout(pendingTimeout);
        pendingTimeout = setTimeout(() => {
          pendingKey = null;
        }, 1000);
        return;
      }

      if (pendingKey === 'g') {
        pendingKey = null;
        if (pendingTimeout) clearTimeout(pendingTimeout);

        switch (event.key) {
          case 'd':
            event.preventDefault();
            navigate('/');
            break;
          case 'c':
            event.preventDefault();
            navigate('/cases');
            break;
          case 'i':
            event.preventDefault();
            navigate('/intake/new');
            break;
        }
        return;
      }
    },
    [enabled, isInputElement, navigate, onSearchOpen, onHelpOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (pendingTimeout) clearTimeout(pendingTimeout);
    };
  }, [handleKeyDown]);
}

// Shortcut definitions for help modal
export const shortcuts = [
  { keys: ['/', '⌘K'], description: 'Open search' },
  { keys: ['Esc'], description: 'Close modal / Clear search' },
  { keys: ['N'], description: 'New intake' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'C'], description: 'Go to Cases' },
  { keys: ['G', 'I'], description: 'Go to Intake' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];
