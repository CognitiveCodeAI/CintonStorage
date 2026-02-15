import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Kbd } from './ui/kbd';
import { shortcuts } from '../hooks/useKeyboardShortcuts';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly without a mouse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Table>
            <TableBody>
              {shortcuts.map((shortcut, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{shortcut.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center">
                          <Kbd>{key}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-xs text-muted-foreground">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">
              Navigation Tips
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Use <Kbd>Tab</Kbd> to move between form fields</li>
              <li>Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate search results and tables</li>
              <li>Use <Kbd>Enter</Kbd> to confirm or submit</li>
              <li>Use <Kbd>Space</Kbd> to toggle checkboxes</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
