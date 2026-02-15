import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  ArrowLeft,
  MapPin,
  User,
  AlertTriangle,
  Phone,
  Mail,
  DollarSign,
  FileText,
  Unlock,
  Plus,
  Calendar,
  Clock,
  Car,
  Printer,
} from 'lucide-react';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [releaseToName, setReleaseToName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: vehicleCase, isLoading, refetch } = trpc.vehicleCase.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const recordPaymentMutation = trpc.vehicleCase.recordPayment.useMutation();
  const releaseVehicleMutation = trpc.vehicleCase.release.useMutation();

  // Calculate days stored
  const daysStored = useMemo(() => {
    if (!vehicleCase?.towDate) return 0;
    const towDate = new Date(vehicleCase.towDate);
    const endDate = vehicleCase.releasedAt ? new Date(vehicleCase.releasedAt) : new Date();
    const diffTime = Math.abs(endDate.getTime() - towDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [vehicleCase?.towDate, vehicleCase?.releasedAt]);

  const handleRecordPayment = async () => {
    if (!paymentAmount || !vehicleCase) return;

    setIsProcessing(true);
    try {
      await recordPaymentMutation.mutateAsync({
        caseId: vehicleCase.id,
        amount: parseFloat(paymentAmount),
        paymentMethod,
      });
      setPaymentModalOpen(false);
      setPaymentAmount('');
      addToast(`Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Payment failed:', error);
      addToast('Failed to record payment. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseVehicle = async () => {
    if (!releaseToName || !vehicleCase) return;

    setIsProcessing(true);
    try {
      await releaseVehicleMutation.mutateAsync({
        caseId: vehicleCase.id,
        releasedTo: releaseToName,
      });
      setReleaseModalOpen(false);
      setReleaseToName('');
      addToast(`Vehicle released to ${releaseToName}`, 'success');
      refetch();
    } catch (error) {
      console.error('Release failed:', error);
      addToast('Failed to release vehicle. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!vehicleCase) {
    return (
      <div className="text-center py-12">
        <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">Case not found</p>
        <Button onClick={() => navigate('/cases')}>
          Back to Cases
        </Button>
      </div>
    );
  }

  const canRelease =
    vehicleCase.status === 'RELEASE_ELIGIBLE' ||
    (vehicleCase.status === 'STORED' && vehicleCase.feeLedgerSummary.balance === 0);

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/cases')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Back to cases"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Case {vehicleCase.caseNumber}
              </h1>
              <StatusBadge status={vehicleCase.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
              {vehicleCase.color && ` - ${vehicleCase.color}`}
            </p>
          </div>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">Cinton Storage - Case {vehicleCase.caseNumber}</h1>
        <p className="text-sm text-gray-600">
          {vehicleCase.year} {vehicleCase.make} {vehicleCase.model} | Status: {vehicleCase.status}
        </p>
      </div>

      {/* Police Hold Alert */}
      {vehicleCase.policeHold && (
        <Alert variant="error" title="Police Hold Active">
          Case #{vehicleCase.policeCaseNumber}
          {vehicleCase.holdExpiresAt && (
            <> - Expires {formatDate(vehicleCase.holdExpiresAt)}</>
          )}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-1">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vehicle Info */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-gray-400" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">VIN</p>
                  <p className="font-mono text-sm">{vehicleCase.vin || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">License Plate</p>
                  <p className="text-sm">
                    {vehicleCase.plateNumber
                      ? `${vehicleCase.plateNumber} (${vehicleCase.plateState})`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Year / Make / Model</p>
                  <p className="text-sm">
                    {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Color</p>
                  <p className="text-sm">{vehicleCase.color || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Type / Class</p>
                  <p className="text-sm">{vehicleCase.vehicleType} / {vehicleCase.vehicleClass}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Yard Location</p>
                  <p className="text-sm font-medium text-primary">
                    {vehicleCase.yardLocation || 'Not assigned'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tow Info */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                Tow Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tow Date</p>
                  <p className="text-sm">{formatDateTime(vehicleCase.towDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Days Stored</p>
                  <p className={`text-sm font-medium ${daysStored >= 30 ? 'text-red-600' : daysStored >= 14 ? 'text-amber-600' : ''}`}>
                    {daysStored} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tow Reason</p>
                  <p className="text-sm">{vehicleCase.towReason.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Requesting Agency</p>
                  <p className="text-sm">{vehicleCase.towingAgency?.name || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tow Location</p>
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {vehicleCase.towLocation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Ledger */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                Fee Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicleCase.feeLedgerEntries.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No fees recorded</p>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase py-2 px-4 sm:px-0">
                            Date
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase py-2">
                            Type
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase py-2 hidden sm:table-cell">
                            Description
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase py-2 px-4 sm:px-0">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {vehicleCase.feeLedgerEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-2 text-sm px-4 sm:px-0">
                              {formatDate(entry.accrualDate)}
                            </td>
                            <td className="py-2">
                              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {entry.feeType}
                              </code>
                            </td>
                            <td className="py-2 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                              {entry.description}
                            </td>
                            <td
                              className={`py-2 text-right font-mono text-sm px-4 sm:px-0 ${
                                Number(entry.amount) < 0
                                  ? 'text-green-600 dark:text-green-400'
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

                  <div className="border-t dark:border-gray-700 mt-4 pt-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Total Charges</span>
                      <span className="font-mono">
                        {formatCurrency(vehicleCase.feeLedgerSummary.totalCharges)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Total Payments</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        -{formatCurrency(vehicleCase.feeLedgerSummary.totalPayments)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t dark:border-gray-700 pt-2">
                      <span>Balance Due</span>
                      <span
                        className={`font-mono ${
                          vehicleCase.feeLedgerSummary.balance > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {formatCurrency(vehicleCase.feeLedgerSummary.balance)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 print:hidden">
          {/* Quick Actions */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={vehicleCase.status === 'RELEASED'}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setReleaseModalOpen(true)}
                  disabled={!canRelease || vehicleCase.policeHold}
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Release Vehicle
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
              </div>

              {vehicleCase.policeHold && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                  Cannot release: Police hold active
                </p>
              )}

              {!canRelease && !vehicleCase.policeHold && vehicleCase.status !== 'RELEASED' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                  Balance must be $0 before release
                </p>
              )}
            </CardContent>
          </Card>

          {/* Owner Info */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicleCase.ownerName ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-sm">{vehicleCase.ownerName}</p>
                  </div>
                  {vehicleCase.ownerAddress && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-sm">{vehicleCase.ownerAddress}</p>
                    </div>
                  )}
                  {vehicleCase.ownerPhone && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <a
                        href={`tel:${vehicleCase.ownerPhone}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {vehicleCase.ownerPhone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No owner information</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                  <p>{formatDateTime(vehicleCase.createdAt)}</p>
                  <p className="text-xs text-gray-500">by {vehicleCase.createdBy.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p>{formatDateTime(vehicleCase.updatedAt)}</p>
                  <p className="text-xs text-gray-500">by {vehicleCase.updatedBy.name}</p>
                </div>
                {vehicleCase.releasedAt && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Released</p>
                    <p>{formatDateTime(vehicleCase.releasedAt)}</p>
                    <p className="text-xs text-gray-500">to {vehicleCase.releasedTo}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Balance due: <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(vehicleCase.feeLedgerSummary.balance)}
              </span>
            </p>
            <Input
              label="Payment Amount"
              type="number"
              step="0.01"
              min="0"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              className="input dark:bg-gray-900 dark:border-gray-700"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="MONEY_ORDER">Money Order</option>
            </select>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRecordPayment}
            loading={isProcessing}
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
          >
            Record Payment
          </Button>
        </ModalFooter>
      </Modal>

      {/* Release Modal */}
      <Modal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Release Vehicle"
        size="sm"
      >
        <div className="space-y-4">
          {vehicleCase.feeLedgerSummary.balance > 0 && (
            <Alert variant="warning">
              Outstanding balance: {formatCurrency(vehicleCase.feeLedgerSummary.balance)}
            </Alert>
          )}
          <Input
            label="Release To (Name)"
            type="text"
            value={releaseToName}
            onChange={(e) => setReleaseToName(e.target.value)}
            placeholder="Enter name of person receiving vehicle"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This will mark the vehicle as released and update the case status.
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setReleaseModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReleaseVehicle}
            loading={isProcessing}
            disabled={!releaseToName.trim()}
          >
            Release Vehicle
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
