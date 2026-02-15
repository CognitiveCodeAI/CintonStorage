import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Car, ArrowRight } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { Kbd } from './ui/Kbd';
import { cn } from '../lib/utils';
import StatusBadge from './StatusBadge';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data, isLoading } = trpc.vehicleCase.search.useQuery(
    { query: query || undefined, limit: 8, offset: 0 },
    { enabled: isOpen && query.length >= 2 }
  );

  const results = data?.cases || [];

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigate(`/cases/${results[selectedIndex].id}`);
            onClose();
          }
          break;
      }
    },
    [results, selectedIndex, navigate, onClose]
  );

  const handleResultClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/35 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:pt-24">
        <div
          className="relative w-full max-w-2xl transform overflow-hidden rounded-lg border border-border bg-surface shadow-none transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              className="h-12 w-full border-0 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              placeholder="Search VIN, plate, case #, or owner..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search vehicles"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="rounded p-1 hover:bg-surface-muted"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <Kbd className="ml-2">Esc</Kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.length < 2 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <p>Type at least 2 characters to search</p>
                <div className="mt-4 flex justify-center gap-4">
                  <button
                    onClick={() => {
                      navigate('/cases');
                      onClose();
                    }}
                    className="flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    <Car className="h-4 w-4" />
                    View all cases
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {query.length >= 2 && isLoading && (
              <div className="px-4 py-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" />
              </div>
            )}

            {query.length >= 2 && !isLoading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No vehicles found for "{query}"
              </div>
            )}

            {results.length > 0 && (
              <ul className="py-2" role="listbox">
                {results.map((vehicleCase, index) => (
                  <li
                    key={vehicleCase.id}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 border-l-2 px-4 py-2.5 transition-colors',
                      index === selectedIndex
                        ? 'border-l-primary bg-accent'
                        : 'border-l-transparent hover:bg-surface-muted'
                    )}
                    onClick={() => handleResultClick(vehicleCase.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-muted">
                        <Car className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {vehicleCase.caseNumber}
                        </span>
                        <StatusBadge status={vehicleCase.status} size="sm" />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                        {vehicleCase.plateNumber && ` • ${vehicleCase.plateNumber}`}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Kbd>/</Kbd>
              or
              <Kbd>⌘K</Kbd>
              to search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
