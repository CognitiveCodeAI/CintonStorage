import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
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
import { EmptyState } from '../../components/ui/empty-state';
import { useToast } from '../../components/ui/toast';
import { Toggle } from '@/components/ui/toggle';
import {
  Search,
  Plus,
  Pencil,
  UserCheck,
  UserX,
  Key,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';

interface UserFormData {
  email: string;
  name: string;
  roleId: string;
  agencyId: string;
  password: string;
}

const initialFormData: UserFormData = {
  email: '',
  name: '',
  roleId: '',
  agencyId: '',
  password: '',
};

export default function UserListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string } | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.admin.users.list.useQuery({
    query: searchQuery || undefined,
    includeInactive: showInactive,
  });

  const { data: roles } = trpc.admin.roles.list.useQuery();
  const { data: agencies } = trpc.agency.list.useQuery();

  const createMutation = trpc.admin.users.create.useMutation({
    onSuccess: () => {
      addToast('User created successfully', 'success');
      utils.admin.users.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to create user: ${error.message}`, 'error');
    },
  });

  const updateMutation = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      addToast('User updated successfully', 'success');
      utils.admin.users.invalidate();
      closeDialog();
    },
    onError: (error) => {
      addToast(`Failed to update user: ${error.message}`, 'error');
    },
  });

  const toggleActiveMutation = trpc.admin.users.toggleActive.useMutation({
    onSuccess: (data) => {
      addToast(`User ${data.active ? 'activated' : 'deactivated'}`, 'success');
      utils.admin.users.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to update user: ${error.message}`, 'error');
    },
  });

  const resetPasswordMutation = trpc.admin.users.resetPassword.useMutation({
    onSuccess: () => {
      addToast('Password reset successfully', 'success');
      setResetPasswordOpen(false);
      setResetPasswordUserId(null);
      setNewPassword('');
    },
    onError: (error) => {
      addToast(`Failed to reset password: ${error.message}`, 'error');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData(initialFormData);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditingUser({ id: user.id });
    setFormData({
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      agencyId: user.agencyId || '',
      password: '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        email: formData.email,
        name: formData.name,
        roleId: formData.roleId,
        agencyId: formData.agencyId || undefined,
      });
    } else {
      createMutation.mutate({
        email: formData.email,
        name: formData.name,
        roleId: formData.roleId,
        agencyId: formData.agencyId || undefined,
        password: formData.password,
      });
    }
  };

  const handleResetPassword = () => {
    if (resetPasswordUserId && newPassword) {
      resetPasswordMutation.mutate({
        id: resetPasswordUserId,
        password: newPassword,
      });
    }
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  return (
    <AdminLayout title="User Management" description="Create and manage user accounts">
      {/* Search and Actions */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
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
                Add User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : !users || users.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No users found"
            description={searchQuery ? `No results for "${searchQuery}"` : 'Create your first user to get started'}
            action={
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id} className={cn(!user.active && 'opacity-60')}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                      {user.role?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.agency?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <span className="inline-flex items-center gap-1 text-success text-sm">
                        <UserCheck className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                        <UserX className="h-3.5 w-3.5" />
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setResetPasswordUserId(user.id);
                          setResetPasswordOpen(true);
                        }}>
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toggleActiveMutation.mutate({ id: user.id })}
                          className={user.active ? 'text-danger' : 'text-success'}
                        >
                          {user.active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user details and role assignment.' : 'Add a new user to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
            {!editingUser && (
              <Input
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Role *</label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Agency (optional)</label>
              <Select
                value={formData.agencyId}
                onValueChange={(value) => setFormData({ ...formData, agencyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No agency assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No agency</SelectItem>
                  {agencies?.map((agency: any) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isMutating}
              disabled={!formData.name || !formData.email || !formData.roleId || (!editingUser && !formData.password)}
            >
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              label="New Password *"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordOpen(false);
              setResetPasswordUserId(null);
              setNewPassword('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              loading={resetPasswordMutation.isLoading}
              disabled={!newPassword}
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
