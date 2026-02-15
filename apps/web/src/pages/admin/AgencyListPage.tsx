import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { EmptyState } from '../../components/ui/empty-state';
import { useToast } from '../../components/ui/toast';
import { Toggle } from '@/components/ui/toggle';
import {
  Search,
  Plus,
  Pencil,
  Building2,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AgencyType } from '../../types';

interface AgencyFormData {
  name: string;
  agencyType: AgencyType;
  orisCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  defaultHoldDays: number;
  autoNotifyOnIntake: boolean;
  autoNotifyOnRelease: boolean;
}

const initialFormData: AgencyFormData = {
  name: '',
  agencyType: AgencyType.POLICE,
  orisCode: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  defaultHoldDays: 14,
  autoNotifyOnIntake: false,
  autoNotifyOnRelease: false,
};

const agencyTypeLabels: Record<AgencyType, string> = {
  [AgencyType.POLICE]: 'Police Department',
  [AgencyType.SHERIFF]: 'Sheriff Department',
  [AgencyType.STATE_POLICE]: 'State Police',
  [AgencyType.MUNICIPAL]: 'Municipal',
  [AgencyType.PRIVATE]: 'Private',
  [AgencyType.OTHER]: 'Other',
};

export default function AgencyListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<{ id: string } | null>(null);
  const [formData, setFormData] = useState<AgencyFormData>(initialFormData);

  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: agencies, isLoading } = trpc.admin.agencies.list.useQuery({
    query: searchQuery || undefined,
    includeInactive: showInactive,
  });

  const createMutation = trpc.admin.agencies.create.useMutation({
    onSuccess: () => {
      addToast('Agency created successfully', 'success');
      utils.admin.agencies.invalidate();
      utils.agency.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to create agency: ${error.message}`, 'error');
    },
  });

  const updateMutation = trpc.admin.agencies.update.useMutation({
    onSuccess: () => {
      addToast('Agency updated successfully', 'success');
      utils.admin.agencies.invalidate();
      utils.agency.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to update agency: ${error.message}`, 'error');
    },
  });

  const toggleActiveMutation = trpc.admin.agencies.toggleActive.useMutation({
    onSuccess: (data) => {
      addToast(`Agency ${data.active ? 'activated' : 'deactivated'}`, 'success');
      utils.admin.agencies.invalidate();
      utils.agency.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to update agency: ${error.message}`, 'error');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAgency(null);
    setFormData(initialFormData);
  };

  const openCreateDialog = () => {
    setEditingAgency(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (agency: any) => {
    setEditingAgency({ id: agency.id });
    setFormData({
      name: agency.name,
      agencyType: agency.agencyType,
      orisCode: agency.orisCode || '',
      contactName: agency.contactName || '',
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone || '',
      address: agency.address || '',
      defaultHoldDays: agency.defaultHoldDays,
      autoNotifyOnIntake: agency.autoNotifyOnIntake,
      autoNotifyOnRelease: agency.autoNotifyOnRelease,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingAgency) {
      updateMutation.mutate({
        id: editingAgency.id,
        ...formData,
        orisCode: formData.orisCode || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
      });
    } else {
      createMutation.mutate({
        ...formData,
        orisCode: formData.orisCode || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
      });
    }
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  return (
    <AdminLayout title="Agency Management" description="Manage towing agencies and their settings">
      {/* Search and Actions */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search agencies..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Toggle
                pressed={showInactive}
                onPressedChange={setShowInactive}
                size="sm"
              >
                Show Inactive
              </Toggle>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Agency
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agencies Table */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : !agencies || agencies.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No agencies found"
            description={searchQuery ? `No results for "${searchQuery}"` : 'Create your first agency to get started'}
            action={
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Agency
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Hold Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.map((agency: any) => (
                <TableRow key={agency.id} className={cn(!agency.active && 'opacity-60')}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{agency.name}</div>
                      {agency.orisCode && (
                        <div className="text-xs text-muted-foreground font-mono">
                          ORIS: {agency.orisCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                      {agencyTypeLabels[agency.agencyType as AgencyType] || agency.agencyType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-sm">
                      {agency.contactName && (
                        <div className="text-foreground">{agency.contactName}</div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {agency.contactEmail}
                      </div>
                      {agency.contactPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {agency.contactPhone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{agency.defaultHoldDays} days</span>
                  </TableCell>
                  <TableCell>
                    {agency.active ? (
                      <span className="inline-flex items-center gap-1 text-success text-sm">
                        <Check className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                        <X className="h-3.5 w-3.5" />
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(agency)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toggleActiveMutation.mutate({ id: agency.id })}
                          className={agency.active ? 'text-danger' : 'text-success'}
                        >
                          {agency.active ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAgency ? 'Edit Agency' : 'Create Agency'}</DialogTitle>
            <DialogDescription>
              {editingAgency ? 'Update agency details and settings.' : 'Add a new towing agency to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Agency Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Clinton Township Police"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium">Type *</label>
                  <Select
                    value={formData.agencyType}
                    onValueChange={(value) => setFormData({ ...formData, agencyType: value as AgencyType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(agencyTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="ORIS Code"
                  value={formData.orisCode}
                  onChange={(e) => setFormData({ ...formData, orisCode: e.target.value })}
                  placeholder="MI0500100"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Contact Name"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Sgt. John Smith"
                />
                <Input
                  label="Contact Email *"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@agency.gov"
                />
                <Input
                  label="Contact Phone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="586-555-0100"
                />
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Address</label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, Clinton Township, MI 48035"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Agency Settings</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Default Hold Duration</label>
                  <Select
                    value={String(formData.defaultHoldDays)}
                    onValueChange={(value) => setFormData({ ...formData, defaultHoldDays: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoNotifyOnIntake}
                    onChange={(e) => setFormData({ ...formData, autoNotifyOnIntake: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Auto-notify agency on vehicle intake</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoNotifyOnRelease}
                    onChange={(e) => setFormData({ ...formData, autoNotifyOnRelease: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Auto-notify agency on vehicle release</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isMutating}
              disabled={!formData.name || !formData.contactEmail}
            >
              {editingAgency ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
