import { useParams, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, MapPin, User, AlertTriangle } from 'lucide-react';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vehicleCase, isLoading } = trpc.vehicleCase.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vehicleCase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Case not found</p>
        <Link to="/cases" className="btn-primary mt-4 inline-block">
          Back to Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/cases"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Case {vehicleCase.caseNumber}
              </h1>
              <StatusBadge status={vehicleCase.status} />
            </div>
            <p className="text-gray-500 mt-1">
              {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
            </p>
          </div>
        </div>
      </div>

      {/* Police Hold Alert */}
      {vehicleCase.policeHold && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Police Hold Active</h3>
            <p className="text-sm text-red-700 mt-1">
              Case #{vehicleCase.policeCaseNumber}
              {vehicleCase.holdExpiresAt && (
                <> - Expires {formatDate(vehicleCase.holdExpiresAt)}</>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Vehicle Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">VIN</p>
                <p className="font-mono">{vehicleCase.vin || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">License Plate</p>
                <p>
                  {vehicleCase.plateNumber
                    ? `${vehicleCase.plateNumber} (${vehicleCase.plateState})`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Year / Make / Model</p>
                <p>
                  {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Color</p>
                <p>{vehicleCase.color || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p>{vehicleCase.vehicleType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle Class</p>
                <p>{vehicleCase.vehicleClass}</p>
              </div>
            </div>
          </div>

          {/* Tow Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Tow Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tow Date</p>
                <p>{formatDateTime(vehicleCase.towDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Intake Date</p>
                <p>
                  {vehicleCase.intakeDate
                    ? formatDateTime(vehicleCase.intakeDate)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tow Reason</p>
                <p>{vehicleCase.towReason.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requesting Agency</p>
                <p>{vehicleCase.towingAgency?.name || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Tow Location</p>
                <p className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                  {vehicleCase.towLocation}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Yard Location</p>
                <p className="font-medium text-lg">
                  {vehicleCase.yardLocation || 'Not assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Fee Ledger */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Fee Ledger</h2>
            {vehicleCase.feeLedgerEntries.length === 0 ? (
              <p className="text-gray-500">No fees recorded</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                          Date
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                          Type
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                          Description
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vehicleCase.feeLedgerEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="py-2 text-sm">
                            {formatDate(entry.accrualDate)}
                          </td>
                          <td className="py-2">
                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                              {entry.feeType}
                            </code>
                          </td>
                          <td className="py-2 text-sm">{entry.description}</td>
                          <td
                            className={`py-2 text-right font-mono ${
                              Number(entry.amount) < 0
                                ? 'text-green-600'
                                : ''
                            }`}
                          >
                            {formatCurrency(Number(entry.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t mt-4 pt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Total Charges</span>
                    <span className="font-mono">
                      {formatCurrency(vehicleCase.feeLedgerSummary.totalCharges)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Payments</span>
                    <span className="font-mono text-green-600">
                      -{formatCurrency(vehicleCase.feeLedgerSummary.totalPayments)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Balance Due</span>
                    <span
                      className={`font-mono ${
                        vehicleCase.feeLedgerSummary.balance > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(vehicleCase.feeLedgerSummary.balance)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Owner Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Owner Information
            </h2>
            {vehicleCase.ownerName ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p>{vehicleCase.ownerName}</p>
                </div>
                {vehicleCase.ownerAddress && (
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p>{vehicleCase.ownerAddress}</p>
                  </div>
                )}
                {vehicleCase.ownerPhone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p>{vehicleCase.ownerPhone}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No owner information</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="btn-outline w-full justify-center" disabled>
                Record Payment
              </button>
              <button className="btn-outline w-full justify-center" disabled>
                Process Release
              </button>
              <button className="btn-outline w-full justify-center" disabled>
                Print Receipt
              </button>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Created</p>
                <p>{formatDateTime(vehicleCase.createdAt)}</p>
                <p className="text-gray-500">by {vehicleCase.createdBy.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p>{formatDateTime(vehicleCase.updatedAt)}</p>
                <p className="text-gray-500">by {vehicleCase.updatedBy.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
