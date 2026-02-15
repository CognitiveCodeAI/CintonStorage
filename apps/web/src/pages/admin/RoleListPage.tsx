import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { SkeletonTable } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { useToast } from '../../components/ui/toast';
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Shield,
  MoreHorizontal,
  Lock,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Permission categories for visual grouping
const permissionCategories = [
  {
    name: 'Cases',
    permissions: [
      { key: 'CASE_VIEW', label: 'View Cases' },
      { key: 'CASE_CREATE', label: 'Create Cases' },
      { key: 'CASE_UPDATE', label: 'Update Cases' },
      { key: 'CASE_DELETE', label: 'Delete Cases' },
      { key: 'CASE_RELEASE', label: 'Release Vehicles' },
    ],
  },
  {
    name: 'Fees & Payments',
    permissions: [
      { key: 'FEE_VIEW', label: 'View Fees' },
      { key: 'FEE_CREATE', label: 'Create Fees' },
      { key: 'FEE_VOID', label: 'Void Fees' },
      { key: 'PAYMENT_RECORD', label: 'Record Payments' },
    ],
  },
  {
    name: 'Notices',
    permissions: [
      { key: 'NOTICE_VIEW', label: 'View Notices' },
      { key: 'NOTICE_CREATE', label: 'Create Notices' },
      { key: 'NOTICE_UPDATE', label: 'Update Notices' },
      { key: 'HEARING_MANAGE', label: 'Manage Hearings' },
    ],
  },
  {
    name: 'Auctions',
    permissions: [
      { key: 'AUCTION_VIEW', label: 'View Auctions' },
      { key: 'AUCTION_MANAGE', label: 'Manage Auctions' },
      { key: 'AUCTION_SELL', label: 'Record Sales' },
    ],
  },
  {
    name: 'Documents',
    permissions: [
      { key: 'DOCUMENT_VIEW', label: 'View Documents' },
      { key: 'DOCUMENT_UPLOAD', label: 'Upload Documents' },
      { key: 'DOCUMENT_DELETE', label: 'Delete Documents' },
    ],
  },
  {
    name: 'Reports',
    permissions: [
      { key: 'REPORT_VIEW', label: 'View Reports' },
      { key: 'REPORT_EXPORT', label: 'Export Reports' },
    ],
  },
  {
    name: 'Administration',
    permissions: [
      { key: 'USER_MANAGE', label: 'Manage Users' },
      { key: 'ROLE_MANAGE', label: 'Manage Roles' },
      { key: 'AGENCY_MANAGE', label: 'Manage Agencies' },
      { key: 'POLICY_MANAGE', label: 'Manage Policies' },
      { key: 'AUDIT_VIEW', label: 'View Audit Log' },
    ],
  },
];

const allPermissions = permissionCategories.flatMap((cat) => cat.permissions.map((p) => p.key));

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

const initialFormData: RoleFormData = {
  name: '',
  description: '',
  permissions: [],
};

export default function RoleListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; isSystem: boolean } | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: roles, isLoading } = trpc.admin.roles.list.useQuery();

  const createMutation = trpc.admin.roles.create.useMutation({
    onSuccess: () => {
      addToast('Role created successfully', 'success');
      utils.admin.roles.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to create role: ${error.message}`, 'error');
    },
  });

  const updateMutation = trpc.admin.roles.update.useMutation({
    onSuccess: () => {
      addToast('Role updated successfully', 'success');
      utils.admin.roles.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to update role: ${error.message}`, 'error');
    },
  });

  const deleteMutation = trpc.admin.roles.delete.useMutation({
    onSuccess: () => {
      addToast('Role deleted successfully', 'success');
      utils.admin.roles.invalidate();
      setDeleteDialogOpen(false);
      setDeletingRoleId(null);
    },
    onError: (error) => {
      addToast(`Failed to delete role: ${error.message}`, 'error');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setFormData(initialFormData);
  };

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (role: any) => {
    setEditingRole({ id: role.id, isSystem: role.isSystem });
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setDialogOpen(true);
  };

  const openCloneDialog = (role: any) => {
    setEditingRole(null);
    setFormData({
      name: `${role.name} (Copy)`,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleAllInCategory = (categoryPermissions: string[]) => {
    const allSelected = categoryPermissions.every((p) => formData.permissions.includes(p));
    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !categoryPermissions.includes(p)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])],
      }));
    }
  };

  const selectAll = () => {
    setFormData((prev) => ({ ...prev, permissions: [...allPermissions] }));
  };

  const selectNone = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  return (
    <AdminLayout title="Roles & Permissions" description="Configure roles and access control">
      {/* Actions */}
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : !roles || roles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Shield}
            title="No roles found"
            description="Create your first role to get started"
            action={
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role: any) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        'h-4 w-4',
                        role.isSystem ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className="font-medium">{role.name}</span>
                      {role.isSystem && (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          <Lock className="h-3 w-3" />
                          System
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {role.description || '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {role.permissions?.length || 0} permissions
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {role._count?.users || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(role)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openCloneDialog(role)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        {!role.isSystem && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingRoleId(role.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-danger"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {editingRole?.isSystem
                ? 'System roles can only have their permissions modified.'
                : 'Configure role name, description, and permissions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Role Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Manager"
                disabled={editingRole?.isSystem}
              />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role..."
                  rows={2}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Permissions</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone}>
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {permissionCategories.map((category) => {
                  const categoryPermissionKeys = category.permissions.map((p) => p.key);
                  const allSelected = categoryPermissionKeys.every((p) => formData.permissions.includes(p));
                  const someSelected = categoryPermissionKeys.some((p) => formData.permissions.includes(p));

                  return (
                    <Card key={category.name} className="bg-surface-muted">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                            onCheckedChange={() => toggleAllInCategory(categoryPermissionKeys)}
                          />
                          <CardTitle className="text-sm">{category.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {category.permissions.map((permission) => (
                            <label
                              key={permission.key}
                              className="flex items-center gap-2 cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={formData.permissions.includes(permission.key)}
                                onCheckedChange={() => togglePermission(permission.key)}
                              />
                              <span className="text-muted-foreground">{permission.label}</span>
                            </label>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
              disabled={!formData.name}
            >
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? Users assigned to this role will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingRoleId(null);
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingRoleId && deleteMutation.mutate({ id: deletingRoleId })}
              loading={deleteMutation.isLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
