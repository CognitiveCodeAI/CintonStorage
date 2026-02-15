import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate, formatDateTime, cn } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Spinner } from '../components/ui/spinner';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  MapPin,
  User,
  AlertTriangle,
  Phone,
  DollarSign,
  Unlock,
  Printer,
  Car,
} from 'lucide-react';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // State for modals
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [releaseToName, setReleaseToName] = useState('');

  const { data: vehicleCase, isLoading, refetch } = trpc.vehicleCase.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const recordPaymentMutation = trpc.vehicleCase.recordPayment.useMutation();
  const releaseVehicleMutation = trpc.vehicleCase.release.useMutation();

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
      addToast(`Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded`, 'success');
      refetch();
      document.getElementById('close-payment-dialog')?.click();
    } catch (error) {
      addToast('Failed to record payment', 'error');
    } finally {
      setIsProcessing(false);
      setPaymentAmount('');
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
      addToast(`Vehicle released to ${releaseToName}`, 'success');
      refetch();
      document.getElementById('close-release-dialog')?.click();
    } catch (error) {
      addToast('Failed to release vehicle', 'error');
    } finally {
      setIsProcessing(false);
      setReleaseToName('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
    );
  }

  if (!vehicleCase) {
    return (
      <div className="text-center py-12">
        <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Case not found</p>
        <Button onClick={() => navigate('/cases')}>Back to Cases</Button>
      </div>
    );
  }

  const canRelease = vehicleCase.status === 'RELEASE_ELIGIBLE' || vehicleCase.status === 'STORED';

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate('/cases')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold">
                Case {vehicleCase.caseNumber}
              </h1>
              <StatusBadge status={vehicleCase.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {vehicleCase.year} {vehicleCase.make} {vehicleCase.model}
              {vehicleCase.color && ` - ${vehicleCase.color}`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">Cinton Storage - Case {vehicleCase.caseNumber}</h1>
        <p className="text-sm text-gray-600">
          {vehicleCase.year} {vehicleCase.make} {vehicleCase.model} | Status: {vehicleCase.status}
        </p>
      </div>

      {vehicleCase.policeHold && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Police Hold Active</AlertTitle>
          <AlertDescription>
            Case #{vehicleCase.policeCaseNumber}
            {vehicleCase.holdExpiresAt && ` - Expires ${formatDate(vehicleCase.holdExpiresAt)}`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-1">
        <div className="lg:col-span-2 space-y-4">
          {/* Vehicle, Tow, and Fee Info Cards */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-muted-foreground" />Vehicle Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground">VIN</p><p className="font-mono text-sm">{vehicleCase.vin || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">License Plate</p><p className="text-sm">{vehicleCase.plateNumber ? `${vehicleCase.plateNumber} (${vehicleCase.plateState})` : '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Year / Make / Model</p><p className="text-sm">{vehicleCase.year} {vehicleCase.make} {vehicleCase.model}</p></div>
                <div><p className="text-xs text-muted-foreground">Color</p><p className="text-sm">{vehicleCase.color || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Type / Class</p><p className="text-sm">{vehicleCase.vehicleType} / {vehicleCase.vehicleClass}</p></div>
                <div><p className="text-xs text-muted-foreground">Yard Location</p><p className="text-sm font-medium text-primary">{vehicleCase.yardLocation || 'Not assigned'}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" />Tow Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground">Tow Date</p><p className="text-sm">{formatDateTime(vehicleCase.towDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Days Stored</p><p className={cn('text-sm font-medium', daysStored >= 30 ? 'text-destructive' : daysStored >= 14 ? 'text-amber-600' : '')}>{daysStored} days</p></div>
                <div><p className="text-xs text-muted-foreground">Tow Reason</p><p className="text-sm">{vehicleCase.towReason.replace(/_/g, ' ')}</p></div>
                <div><p className="text-xs text-muted-foreground">Requesting Agency</p><p className="text-sm">{vehicleCase.towingAgency?.name || '-'}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Tow Location</p><p className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{vehicleCase.towLocation}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground" />Fee Ledger</CardTitle></CardHeader>
            <CardContent>
              {vehicleCase.feeLedgerEntries.length === 0 ? <p className="text-muted-foreground text-sm">No fees recorded</p> : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleCase.feeLedgerEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">{formatDate(entry.accrualDate)}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{entry.feeType}</code></TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{entry.description}</TableCell>
                          <TableCell className={cn('text-right font-mono text-sm', Number(entry.amount) < 0 ? 'text-green-600' : '')}>{formatCurrency(Number(entry.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Separator className="my-4" />
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Charges</span><span className="font-mono">{formatCurrency(vehicleCase.feeLedgerSummary.totalCharges)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Payments</span><span className="font-mono text-green-600">-{formatCurrency(vehicleCase.feeLedgerSummary.totalPayments)}</span></div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold"><span >Balance Due</span><span className={cn('font-mono', vehicleCase.feeLedgerSummary.balance > 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(vehicleCase.feeLedgerSummary.balance)}</span></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Dialog>
                  <DialogTrigger asChild><Button variant="primary" className="w-full" disabled={vehicleCase.status === 'RELEASED'}><DollarSign className="h-4 w-4 mr-2" />Record Payment</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">Balance due: <span className="font-mono font-semibold text-foreground">{formatCurrency(vehicleCase.feeLedgerSummary.balance)}</span></p>
                      <Input label="Payment Amount" type="number" step="0.01" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Method</label>
                        <Select onValueChange={setPaymentMethod} defaultValue={paymentMethod}>
                          <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CHECK">Check</SelectItem>
                            <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                            <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                            <SelectItem value="MONEY_ORDER">Money Order</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button id="close-payment-dialog" variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleRecordPayment} loading={isProcessing} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>Record Payment</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" className="w-full" disabled={!canRelease || vehicleCase.policeHold}><Unlock className="h-4 w-4 mr-2" />Release Vehicle</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>Release Vehicle</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      {vehicleCase.feeLedgerSummary.balance > 0 && <Alert variant="warning"><AlertDescription>Outstanding balance: {formatCurrency(vehicleCase.feeLedgerSummary.balance)}</AlertDescription></Alert>}
                      <Input label="Release To (Name)" type="text" value={releaseToName} onChange={(e) => setReleaseToName(e.target.value)} placeholder="Enter name of person receiving vehicle" />
                      <p className="text-xs text-muted-foreground">This will mark the vehicle as released and update the case status.</p>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button id="close-release-dialog" variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleReleaseVehicle} loading={isProcessing} disabled={!releaseToName.trim()}>Release Vehicle</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {vehicleCase.policeHold && <p className="text-xs text-destructive mt-3">Cannot release: Police hold active</p>}
              {!canRelease && !vehicleCase.policeHold && vehicleCase.status !== 'RELEASED' && vehicleCase.feeLedgerSummary.balance > 0 && <p className="text-xs text-amber-600 mt-3">Balance must be $0 before release</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-muted-foreground" />Owner Information</CardTitle></CardHeader>
            <CardContent>
              {(vehicleCase.ownerFirstName || vehicleCase.ownerLastName) ? (
                <div className="space-y-3">
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm">{[vehicleCase.ownerFirstName, vehicleCase.ownerLastName].filter(Boolean).join(' ')}</p></div>
                  {(vehicleCase.ownerAddress || vehicleCase.ownerCity) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      {vehicleCase.ownerAddress && <p className="text-sm">{vehicleCase.ownerAddress}</p>}
                      {vehicleCase.ownerCity && <p className="text-sm">{[vehicleCase.ownerCity, vehicleCase.ownerState].filter(Boolean).join(', ')}{vehicleCase.ownerZip ? ` ${vehicleCase.ownerZip}` : ''}</p>}
                    </div>
                  )}
                  {vehicleCase.ownerPhone && <div><p className="text-xs text-muted-foreground">Phone</p><a href={`tel:${vehicleCase.ownerPhone}`} className="text-sm text-primary hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{vehicleCase.ownerPhone}</a></div>}
                </div>
              ) : <p className="text-muted-foreground text-sm">No owner information</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Created</p><p>{formatDateTime(vehicleCase.createdAt)} by {vehicleCase.createdBy.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Last Updated</p><p>{formatDateTime(vehicleCase.updatedAt)} by {vehicleCase.updatedBy.name}</p></div>
                {vehicleCase.releasedAt && <div><p className="text-xs text-muted-foreground">Released</p><p>{formatDateTime(vehicleCase.releasedAt)} to {vehicleCase.releasedTo}</p></div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
