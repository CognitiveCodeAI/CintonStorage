import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Eye,
  DollarSign,
  Clock,
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
    if (balance === 0) return 'text-green-600 dark:text-green-400';
    if (status === 'RELEASED') return 'text-gray-600 dark:text-gray-400';
    if (balance > 500) return 'text-red-600 dark:text-red-400 font-semibold';
    return 'text-gray-900 dark:text-gray-100';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Vehicle Cases
          </h1>
          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by VIN, plate, case #, or owner..."
              className="input pl-10 pr-10 dark:bg-gray-900 dark:border-gray-700"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusParam === filter.value ||
                  (!statusParam && filter.value === undefined)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort('caseNumber')}
                  >
                    <div className="flex items-center gap-1">
                      Case #
                      {renderSortIcon('caseNumber')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort('vehicle')}
                  >
                    <div className="flex items-center gap-1">
                      Vehicle
                      {renderSortIcon('vehicle')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Plate
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort('daysStored')}
                  >
                    <div className="flex items-center gap-1">
                      Days
                      {renderSortIcon('daysStored')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort('towDate')}
                  >
                    <div className="flex items-center gap-1">
                      Tow Date
                      {renderSortIcon('towDate')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort('balance')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Balance
                      {renderSortIcon('balance')}
                    </div>
                  </th>
                  <th scope="col" className="relative px-4 py-3 w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedCases.map((vehicleCase) => (
                  <tr
                    key={vehicleCase.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
                    onClick={() => handleRowClick(vehicleCase.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                          {vehicleCase.caseNumber}
                        </span>
                        {vehicleCase.policeHold && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" title="Police Hold" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {vehicleCase.color}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {vehicleCase.plateNumber ? (
                        <span className="font-mono">
                          {vehicleCase.plateNumber}
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            ({vehicleCase.plateState})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={vehicleCase.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          vehicleCase.daysStored >= 30
                            ? 'text-red-600 dark:text-red-400'
                            : vehicleCase.daysStored >= 14
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {vehicleCase.daysStored}d
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(vehicleCase.towDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span
                        className={cn(
                          'font-mono text-sm',
                          getBalanceColor(vehicleCase.balance, vehicleCase.status)
                        )}
                      >
                        {formatCurrency(vehicleCase.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination / Count */}
          {data && data.total > sortedCases.length && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {sortedCases.length} of {data.total} cases
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Keyboard hint */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Press <Kbd>/</Kbd> to search
      </p>
    </div>
  );
}
