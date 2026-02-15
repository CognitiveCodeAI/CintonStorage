import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonTable } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Kbd } from '../components/ui/Kbd';
import {
  Search,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Car,
  AlertTriangle,
} from 'lucide-react';
import { VehicleCaseStatus } from '../types';
import { cn } from '../lib/utils';

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Stored', value: 'STORED' },
  { label: 'On Hold', value: 'HOLD' },
  { label: 'Ready', value: 'RELEASE_ELIGIBLE' },
  { label: 'Released', value: 'RELEASED' },
];

type SortKey = 'caseNumber' | 'vehicle' | 'towDate' | 'daysStored' | 'balance';
type SortDirection = 'asc' | 'desc';

export default function CaseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [sortKey, setSortKey] = useState<SortKey>('towDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const statusParam = searchParams.get('status') as VehicleCaseStatus | null;
  const navigate = useNavigate();

  const { data, isLoading } = trpc.vehicleCase.search.useQuery({
    query: searchQuery || undefined,
    status: statusParam || undefined,
    limit: 50,
    offset: 0,
  });

  // Calculate days stored for each case
  const casesWithDays = useMemo(() => {
    if (!data?.cases) return [];

    return data.cases.map((c) => {
      const towDate = new Date(c.towDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - towDate.getTime());
      const daysStored = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...c, daysStored };
    });
  }, [data?.cases]);

  // Sort cases
  const sortedCases = useMemo(() => {
    const sorted = [...casesWithDays];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'caseNumber':
          comparison = a.caseNumber.localeCompare(b.caseNumber);
          break;
        case 'vehicle':
          const vehicleA = `${a.year || ''} ${a.make || ''} ${a.model || ''}`.trim();
          const vehicleB = `${b.year || ''} ${b.make || ''} ${b.model || ''}`.trim();
          comparison = vehicleA.localeCompare(vehicleB);
          break;
        case 'towDate':
          comparison = new Date(a.towDate).getTime() - new Date(b.towDate).getTime();
          break;
        case 'daysStored':
          comparison = a.daysStored - b.daysStored;
          break;
        case 'balance':
          comparison = a.balance - b.balance;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [casesWithDays, sortKey, sortDirection]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('query', searchQuery);
    } else {
      params.delete('query');
    }
    setSearchParams(params);
  };

  const handleStatusFilter = (status: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    setSearchParams(params);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  // Balance color helper
  const getBalanceColor = (balance: number, status: string) => {
    if (balance === 0) return 'text-success';
    if (status === 'RELEASED') return 'text-muted-foreground';
    if (balance > 500) return 'text-danger font-semibold';
    return 'text-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="ops-page-title">
            Vehicle Cases
          </h1>
          {data && (
            <p className="ops-page-subtitle mt-0.5">
              {data.total} total cases
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/intake/new')}>
          New Intake
        </Button>
      </div>

      {/* Search and Filters */}
      <Card padding="sm">
        <form onSubmit={handleSearch} className="flex gap-2 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by VIN, plate, case #, or owner..."
              className="input pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search cases"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  const params = new URLSearchParams(searchParams);
                  params.delete('query');
                  setSearchParams(params);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => handleStatusFilter(filter.value)}
              className={cn(
                'px-2.5 py-1 rounded-md border text-xs font-semibold tracking-wide transition-colors',
                statusParam === filter.value ||
                  (!statusParam && filter.value === undefined)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : sortedCases.length === 0 ? (
        <Card>
          <EmptyState
            icon={Car}
            title="No cases found"
            description={searchQuery ? `No results for "${searchQuery}"` : 'No cases match the selected filters'}
            action={
              <Button onClick={() => navigate('/intake/new')}>
                Create New Intake
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-muted">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort('caseNumber')}
                  >
                    <div className="flex items-center gap-1">
                      Case #
                      {renderSortIcon('caseNumber')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort('vehicle')}
                  >
                    <div className="flex items-center gap-1">
                      Vehicle
                      {renderSortIcon('vehicle')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Plate
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort('daysStored')}
                  >
                    <div className="flex items-center gap-1">
                      Days
                      {renderSortIcon('daysStored')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort('towDate')}
                  >
                    <div className="flex items-center gap-1">
                      Tow Date
                      {renderSortIcon('towDate')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort('balance')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Balance
                      {renderSortIcon('balance')}
                    </div>
                  </th>
                  <th scope="col" className="relative w-9 px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {sortedCases.map((vehicleCase) => (
                  <tr
                    key={vehicleCase.id}
                    className="group cursor-pointer border-l-2 border-l-transparent transition-colors hover:border-l-ring hover:bg-surface-muted focus-visible:border-l-ring focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => handleRowClick(vehicleCase.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(vehicleCase.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open case ${vehicleCase.caseNumber}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {vehicleCase.caseNumber}
                        </span>
                        {vehicleCase.policeHold && (
                          <AlertTriangle className="h-3.5 w-3.5 text-danger" aria-label="Police hold" />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vehicleCase.color}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">
                      {vehicleCase.plateNumber ? (
                        <span className="font-mono">
                          {vehicleCase.plateNumber}
                          <span className="ml-1 text-muted-foreground/80">
                            ({vehicleCase.plateState})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/80">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={vehicleCase.status} size="sm" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          vehicleCase.daysStored >= 30
                            ? 'text-danger'
                            : vehicleCase.daysStored >= 14
                            ? 'text-warning'
                            : 'text-foreground'
                        )}
                      >
                        {vehicleCase.daysStored}d
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">
                      {formatDate(vehicleCase.towDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          'font-mono text-sm [font-variant-numeric:tabular-nums]',
                          getBalanceColor(vehicleCase.balance, vehicleCase.status)
                        )}
                      >
                        {formatCurrency(vehicleCase.balance)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination / Count */}
          {data && data.total > sortedCases.length && (
            <div className="border-t border-border bg-surface-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Showing {sortedCases.length} of {data.total} cases
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center">
        Press <Kbd>/</Kbd> to search
      </p>
    </div>
  );
}
