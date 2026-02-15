import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonTable } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import {
  DollarSign,
  Pencil,
  Plus,
  Save,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { FeeType, VehicleClass } from '../../types';

interface FeeConfig {
  feeType: string;
  label: string;
  description: string;
  baseAmount: number;
  vehicleClassAmounts: Record<string, number>;
}

const feeTypeLabels: Record<string, { label: string; description: string }> = {
  TOW: { label: 'Tow Fee', description: 'Standard tow service charge' },
  ADMIN: { label: 'Administrative Fee', description: 'Processing and paperwork fee' },
  STORAGE_DAILY: { label: 'Daily Storage', description: 'Per-day storage charge' },
  GATE: { label: 'Gate Fee', description: 'After-hours release fee' },
  LIEN_PROCESSING: { label: 'Lien Processing', description: 'Title/lien processing fee' },
  TITLE_SEARCH: { label: 'Title Search', description: 'Vehicle title search fee' },
  NOTICE: { label: 'Notice Fee', description: 'Compliance notice mailing fee' },
  DOLLY: { label: 'Dolly Service', description: 'Dolly/wheel-lift service' },
  WINCH: { label: 'Winch Service', description: 'Winch recovery service' },
  MILEAGE: { label: 'Mileage', description: 'Per-mile tow charge' },
};

const vehicleClassLabels: Record<string, string> = {
  STANDARD: 'Standard',
  LARGE: 'Large',
  MOTORCYCLE: 'Motorcycle',
  OVERSIZED: 'Oversized',
  TRAILER: 'Trailer',
};

export default function FeeSchedulePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [classAmounts, setClassAmounts] = useState<Record<string, string>>({});

  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: feeSchedule, isLoading } = trpc.admin.feeSchedule.list.useQuery();

  const updateMutation = trpc.admin.feeSchedule.update.useMutation({
    onSuccess: () => {
      addToast('Fee schedule updated successfully', 'success');
      utils.admin.feeSchedule.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to update fee: ${error.message}`, 'error');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingFee(null);
    setBaseAmount('');
    setClassAmounts({});
  };

  const openEditDialog = (fee: FeeConfig) => {
    setEditingFee(fee);
    setBaseAmount(fee.baseAmount.toString());
    const amounts: Record<string, string> = {};
    Object.values(VehicleClass).forEach((vc) => {
      amounts[vc] = (fee.vehicleClassAmounts[vc] ?? fee.baseAmount).toString();
    });
    setClassAmounts(amounts);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!editingFee) return;

    const vehicleClassAmounts: Record<string, number> = {};
    Object.entries(classAmounts).forEach(([vc, amount]) => {
      vehicleClassAmounts[vc] = parseFloat(amount) || 0;
    });

    updateMutation.mutate({
      feeType: editingFee.feeType,
      baseAmount: parseFloat(baseAmount) || 0,
      vehicleClassAmounts,
    });
  };

  const fees: FeeConfig[] = feeSchedule || Object.keys(feeTypeLabels).map((feeType) => ({
    feeType,
    label: feeTypeLabels[feeType].label,
    description: feeTypeLabels[feeType].description,
    baseAmount: 0,
    vehicleClassAmounts: {},
  }));

  return (
    <AdminLayout title="Fee Schedule" description="Configure fee amounts by type and vehicle class">
      {/* Info Card */}
      <Card className="mb-6 bg-info-muted border-info/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-info mt-0.5" />
            <div>
              <p className="font-medium text-info-foreground">Fee Configuration</p>
              <p className="text-sm text-info-foreground/80 mt-1">
                Set base fee amounts for each fee type. You can also configure different rates
                for each vehicle class (Standard, Large, Motorcycle, Oversized, Trailer).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Schedule Table */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee Type</TableHead>
                <TableHead className="text-right">Base Amount</TableHead>
                <TableHead className="text-right">Standard</TableHead>
                <TableHead className="text-right">Large</TableHead>
                <TableHead className="text-right">Motorcycle</TableHead>
                <TableHead className="text-right">Oversized</TableHead>
                <TableHead className="text-right">Trailer</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.feeType}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{fee.label}</div>
                      <div className="text-xs text-muted-foreground">{fee.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(fee.baseAmount)}
                  </TableCell>
                  {Object.values(VehicleClass).map((vc) => (
                    <TableCell key={vc} className="text-right font-mono text-muted-foreground">
                      {fee.vehicleClassAmounts[vc] !== undefined
                        ? formatCurrency(fee.vehicleClassAmounts[vc])
                        : '-'}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(fee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Quick Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tow + Admin</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(
                (fees.find((f) => f.feeType === 'TOW')?.baseAmount || 0) +
                (fees.find((f) => f.feeType === 'ADMIN')?.baseAmount || 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Storage</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(fees.find((f) => f.feeType === 'STORAGE_DAILY')?.baseAmount || 0)}/day
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gate Fee</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(fees.find((f) => f.feeType === 'GATE')?.baseAmount || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lien Processing</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(fees.find((f) => f.feeType === 'LIEN_PROCESSING')?.baseAmount || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingFee?.label}</DialogTitle>
            <DialogDescription>
              {editingFee?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Base Amount *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-9 font-mono"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Default amount when no vehicle class override is set
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Vehicle Class Overrides</label>
              <div className="space-y-2">
                {Object.entries(vehicleClassLabels).map(([vc, label]) => (
                  <div key={vc} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-muted-foreground">{label}</span>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-9 font-mono"
                        value={classAmounts[vc] || ''}
                        onChange={(e) => setClassAmounts({ ...classAmounts, [vc]: e.target.value })}
                        placeholder={baseAmount || '0.00'}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Leave blank to use the base amount for that vehicle class
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={updateMutation.isLoading}
              disabled={!baseAmount}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
