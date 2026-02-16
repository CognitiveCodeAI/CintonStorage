import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { SkeletonTable } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import {
  DollarSign,
  Pencil,
  Plus,
  Save,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { VehicleClass } from '../../types';

interface FeeConfig {
  id: string;
  feeType: string;
  label: string;
  description: string;
  isSystem: boolean;
  isRecurring: boolean;
  baseAmount: number;
  vehicleClassAmounts: Record<string, number>;
}

interface FeeTypeRecord {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  isCredit: boolean;
  isRecurring: boolean;
  active: boolean;
  displayOrder: number;
}

const vehicleClassLabels: Record<string, string> = {
  STANDARD: 'Standard',
  LARGE: 'Large',
  MOTORCYCLE: 'Motorcycle',
  OVERSIZED: 'Oversized',
  TRAILER: 'Trailer',
};

export default function FeeSchedulePage() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [classAmounts, setClassAmounts] = useState<Record<string, string>>({});

  // Fee type creation state
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeIsRecurring, setNewTypeIsRecurring] = useState(false);

  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: feeSchedule, isLoading } = trpc.admin.feeSchedule.list.useQuery();
  const { data: feeTypes, isLoading: feeTypesLoading } = trpc.admin.feeTypes.list.useQuery({ includeInactive: true });

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

  const createFeeTypeMutation = trpc.admin.feeTypes.create.useMutation({
    onSuccess: () => {
      addToast('Fee type created successfully', 'success');
      utils.admin.feeTypes.invalidate();
      utils.admin.feeSchedule.invalidate();
      closeCreateTypeDialog();
    },
    onError: (error) => {
      addToast(`Failed to create fee type: ${error.message}`, 'error');
    },
  });

  const toggleFeeTypeMutation = trpc.admin.feeTypes.toggleActive.useMutation({
    onSuccess: (data) => {
      addToast(`Fee type ${data.active ? 'activated' : 'deactivated'}`, 'success');
      utils.admin.feeTypes.invalidate();
      utils.admin.feeSchedule.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to toggle fee type: ${error.message}`, 'error');
    },
  });

  const deleteFeeTypeMutation = trpc.admin.feeTypes.delete.useMutation({
    onSuccess: () => {
      addToast('Fee type deleted', 'success');
      utils.admin.feeTypes.invalidate();
      utils.admin.feeSchedule.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to delete fee type: ${error.message}`, 'error');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingFee(null);
    setBaseAmount('');
    setClassAmounts({});
  };

  const closeCreateTypeDialog = () => {
    setCreateTypeDialogOpen(false);
    setNewTypeCode('');
    setNewTypeLabel('');
    setNewTypeDescription('');
    setNewTypeIsRecurring(false);
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

  const handleCreateFeeType = () => {
    if (!newTypeCode || !newTypeLabel) return;

    createFeeTypeMutation.mutate({
      code: newTypeCode.toUpperCase().replace(/\s+/g, '_'),
      label: newTypeLabel,
      description: newTypeDescription || undefined,
      isRecurring: newTypeIsRecurring,
      isCredit: false,
    });
  };

  const fees: FeeConfig[] = feeSchedule || [];

  return (
    <AdminLayout title="Fee Schedule" description="Configure fee amounts by type and vehicle class">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="schedule">Fee Schedule</TabsTrigger>
          <TabsTrigger value="types">Fee Types</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
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
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{fee.label}</div>
                            <div className="text-xs text-muted-foreground">{fee.description}</div>
                          </div>
                          {fee.isRecurring && (
                            <Badge variant="outline" className="text-xs">Daily</Badge>
                          )}
                          {!fee.isSystem && (
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          )}
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
        </TabsContent>

        <TabsContent value="types">
          {/* Fee Types Management */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium">Fee Types</h3>
              <p className="text-sm text-muted-foreground">
                Manage fee types including custom charges like hazmat cleanup or key replacement.
              </p>
            </div>
            <Button onClick={() => setCreateTypeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Type
            </Button>
          </div>

          {feeTypesLoading ? (
            <SkeletonTable rows={6} />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeTypes?.map((ft: FeeTypeRecord) => (
                    <TableRow key={ft.id} className={!ft.active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">{ft.code}</TableCell>
                      <TableCell className="font-medium">{ft.label}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ft.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ft.isSystem && <Badge variant="outline">System</Badge>}
                          {ft.isCredit && <Badge variant="secondary">Credit</Badge>}
                          {ft.isRecurring && <Badge>Daily</Badge>}
                          {!ft.isSystem && !ft.isCredit && !ft.isRecurring && (
                            <Badge variant="outline">Custom</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ft.active ? 'default' : 'secondary'}>
                          {ft.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!ft.isSystem && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleFeeTypeMutation.mutate({ id: ft.id })}
                                title={ft.active ? 'Deactivate' : 'Activate'}
                              >
                                {ft.active ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('Delete this fee type? This cannot be undone.')) {
                                    deleteFeeTypeMutation.mutate({ id: ft.id });
                                  }
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Fee Amount Dialog */}
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
              <Label className="mb-1 block">Base Amount *</Label>
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
              <Label className="mb-2 block">Vehicle Class Overrides</Label>
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

      {/* Create Fee Type Dialog */}
      <Dialog open={createTypeDialogOpen} onOpenChange={setCreateTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Fee Type</DialogTitle>
            <DialogDescription>
              Add a new custom fee type for charges like hazmat cleanup, key replacement, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-1 block">Code *</Label>
              <Input
                value={newTypeCode}
                onChange={(e) => setNewTypeCode(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
                placeholder="HAZMAT_CLEANUP"
                className="font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Uppercase letters and underscores only (e.g., HAZMAT_CLEANUP)
              </p>
            </div>

            <div>
              <Label className="mb-1 block">Label *</Label>
              <Input
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                placeholder="Hazmat Cleanup"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Display name shown to users
              </p>
            </div>

            <div>
              <Label className="mb-1 block">Description</Label>
              <Input
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Fee for hazardous material cleanup"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={newTypeIsRecurring}
                onCheckedChange={(checked) => setNewTypeIsRecurring(checked === true)}
              />
              <Label htmlFor="isRecurring" className="text-sm font-normal">
                Recurring (daily charge)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateTypeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFeeType}
              loading={createFeeTypeMutation.isLoading}
              disabled={!newTypeCode || !newTypeLabel}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Fee Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
