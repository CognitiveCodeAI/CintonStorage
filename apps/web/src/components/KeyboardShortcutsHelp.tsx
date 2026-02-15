import { Modal } from './ui/Modal';
import { Kbd } from './ui/Kbd';
import { shortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use these shortcuts to navigate quickly without a mouse.
        </p>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center">
                    <Kbd>{key}</Kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-xs text-gray-400">then</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Navigation Tips
          </h4>
          <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <li>Use <Kbd>Tab</Kbd> to move between form fields</li>
            <li>Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate search results and tables</li>
            <li>Use <Kbd>Enter</Kbd> to confirm or submit</li>
            <li>Use <Kbd>Space</Kbd> to toggle checkboxes</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
