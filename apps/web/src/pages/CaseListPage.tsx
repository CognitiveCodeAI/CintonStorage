import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SkeletonTable } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { Kbd } from '../components/ui/kbd';
import { Toggle } from '@/components/ui/toggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  const holdCount = sortedCases.filter((c) => c.status === 'HOLD').length;
  const readyCount = sortedCases.filter((c) => c.status === 'RELEASE_ELIGIBLE').length;
  const highBalanceCount = sortedCases.filter((c) => c.balance >= 500 && c.status !== 'RELEASED').length;

  const getRowTone = (status: string) => {
    if (status === 'HOLD') return 'hover:border-l-danger focus-visible:border-l-danger';
    if (status === 'RELEASE_ELIGIBLE') return 'hover:border-l-success focus-visible:border-l-success';
    if (status === 'RELEASED') return 'hover:border-l-muted-foreground focus-visible:border-l-muted-foreground';
    return 'hover:border-l-info focus-visible:border-l-info';
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Visible Cases</p>
            <CardTitle className="text-2xl font-semibold">{sortedCases.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Current filter scope</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Release Queue</p>
            <CardTitle className="text-2xl font-semibold text-success">{readyCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{holdCount} currently on hold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">High Balance</p>
            <CardTitle className="text-2xl font-semibold text-danger">{highBalanceCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Cases above $500 outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by VIN, plate, case #, or owner..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search cases"
              />
            </div>
            <Button type="submit" className="min-w-[6.5rem]">Search</Button>
          </form>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {statusFilters.map((filter) => (
              <Toggle
                key={filter.label}
                pressed={statusParam === filter.value || (!statusParam && filter.value === undefined)}
                onPressedChange={() => handleStatusFilter(filter.value)}
                size="sm"
                className="tracking-wide"
              >
                {filter.label}
              </Toggle>
            ))}
          </div>
        </CardContent>
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('caseNumber')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1">Case #{renderSortIcon('caseNumber')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('vehicle')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1">Vehicle{renderSortIcon('vehicle')}</div>
                </TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead onClick={() => handleSort('daysStored')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1">Days{renderSortIcon('daysStored')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('towDate')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1">Tow Date{renderSortIcon('towDate')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('balance')} className="text-right cursor-pointer select-none">
                  <div className="flex items-center gap-1 justify-end">Balance{renderSortIcon('balance')}</div>
                </TableHead>
                <TableHead className="relative w-9"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCases.map((vehicleCase) => (
                <TableRow
                  key={vehicleCase.id}
                  className={cn(
                    'group cursor-pointer border-l-2 border-l-transparent transition-colors',
                    getRowTone(vehicleCase.status)
                  )}
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-muted text-[11px] font-semibold text-muted-foreground">
                        {vehicleCase.make?.[0] || 'V'}
                      </span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {vehicleCase.caseNumber}
                      </span>
                      {vehicleCase.policeHold && (
                        <AlertTriangle className="h-3.5 w-3.5 text-danger" aria-label="Police hold" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vehicleCase.color}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
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
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={vehicleCase.status} size="sm" />
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(vehicleCase.towDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'font-mono text-sm [font-variant-numeric:tabular-nums]',
                        getBalanceColor(vehicleCase.balance, vehicleCase.status)
                      )}
                    >
                      {formatCurrency(vehicleCase.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center">
        Press <Kbd>/</Kbd> to search
      </p>
    </div>
  );
}
