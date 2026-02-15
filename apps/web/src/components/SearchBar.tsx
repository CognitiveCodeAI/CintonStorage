import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ArrowRight } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { Kbd } from './ui/kbd';
import StatusBadge from './StatusBadge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data, isLoading } = trpc.vehicleCase.search.useQuery(
    { query: query || undefined, limit: 8, offset: 0 },
    { enabled: isOpen && query.length >= 2 }
  );

  const results = data?.cases || [];

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelect = useCallback((caseId: string) => {
    navigate(`/cases/${caseId}`);
    onClose();
  }, [navigate, onClose]);

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder="Search VIN, plate, case #, or owner..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.length < 2 && (
          <CommandEmpty>
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>Type at least 2 characters to search</p>
              <div className="mt-4 flex justify-center gap-4">
                <button onClick={() => handleSelect('/cases')} className="flex items-center gap-2 font-medium text-primary hover:underline">
                  <Car className="h-4 w-4" /> View all cases <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </CommandEmpty>
        )}
        {query.length >= 2 && isLoading && !results.length && (
          <CommandEmpty>
            <div className="py-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" />
            </div>
          </CommandEmpty>
        )}
        {query.length >= 2 && !isLoading && results.length === 0 && (
          <CommandEmpty>No results found for "{query}".</CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Cases">
            {results.map((vehicleCase) => (
              <CommandItem
                key={vehicleCase.id}
                value={vehicleCase.id}
                onSelect={() => handleSelect(vehicleCase.id)}
                className="flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">{vehicleCase.caseNumber}</span>
                    <StatusBadge status={vehicleCase.status} size="sm" />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                    {vehicleCase.plateNumber && ` • ${vehicleCase.plateNumber}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> to navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> to select</span>
        </div>
        <span className="flex items-center gap-1"><Kbd>/</Kbd> or <Kbd>⌘K</Kbd> to search</span>
      </div>
    </CommandDialog>
  );
}
