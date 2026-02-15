import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { Search, ChevronRight } from 'lucide-react';
import { VehicleCaseStatus } from '../types';

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Stored', value: 'STORED' },
  { label: 'On Hold', value: 'HOLD' },
  { label: 'Ready', value: 'RELEASE_ELIGIBLE' },
  { label: 'Released', value: 'RELEASED' },
];

export default function CaseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const statusParam = searchParams.get('status') as VehicleCaseStatus | null;

  const { data, isLoading } = trpc.vehicleCase.search.useQuery({
    query: searchQuery || undefined,
    status: statusParam || undefined,
    limit: 20,
    offset: 0,
  });

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Cases</h1>
        <Link to="/intake/new" className="btn-primary">
          New Intake
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by VIN, plate, case number, or owner..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        {/* Status Filters */}
        <div className="flex gap-2 mt-4">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => handleStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusParam === filter.value ||
                (!statusParam && filter.value === undefined)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data?.cases.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No cases found</p>
          <Link to="/intake/new" className="btn-primary mt-4 inline-block">
            Create New Intake
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tow Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.cases.map((vehicleCase) => (
                  <tr
                    key={vehicleCase.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/cases/${vehicleCase.id}`)
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">
                        {vehicleCase.caseNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">
                          {vehicleCase.year} {vehicleCase.make}{' '}
                          {vehicleCase.model}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vehicleCase.color}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicleCase.plateNumber
                        ? `${vehicleCase.plateNumber} (${vehicleCase.plateState})`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={vehicleCase.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(vehicleCase.towDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`font-medium ${
                          vehicleCase.balance > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {formatCurrency(vehicleCase.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.total > 20 && (
            <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-500">
              Showing {data.cases.length} of {data.total} cases
            </div>
          )}
        </div>
      )}
    </div>
  );
}
