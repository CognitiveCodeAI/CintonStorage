import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { trpc } from '../../lib/trpc';
import {
  Users,
  Shield,
  Building2,
  DollarSign,
  MapPin,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminSections = [
  {
    href: '/admin/users',
    label: 'User Management',
    description: 'Create, edit, and manage user accounts. Assign roles and control access.',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    href: '/admin/roles',
    label: 'Roles & Permissions',
    description: 'Configure roles and their permissions. Control what users can access.',
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    href: '/admin/agencies',
    label: 'Agency Management',
    description: 'Manage towing agencies, contacts, and agency-specific settings.',
    icon: Building2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    href: '/admin/fees',
    label: 'Fee Schedule',
    description: 'Configure tow fees, storage rates, and additional charges.',
    icon: DollarSign,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    href: '/admin/yard',
    label: 'Yard Locations',
    description: 'Define yard sections, spots, and lot capacity settings.',
    icon: MapPin,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    href: '/admin/settings',
    label: 'System Settings',
    description: 'Configure default values, regional settings, and business info.',
    icon: Settings,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
  },
];

export default function AdminDashboardPage() {
  const { data: userCount } = trpc.admin.users.count.useQuery(undefined, {
    retry: false,
  });
  const { data: roleCount } = trpc.admin.roles.count.useQuery(undefined, {
    retry: false,
  });
  const { data: agencyCount } = trpc.admin.agencies.count.useQuery(undefined, {
    retry: false,
  });

  return (
    <AdminLayout title="Administration" description="Manage system configuration and access control">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{userCount ?? '...'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Roles</CardDescription>
            <CardTitle className="text-2xl">{roleCount ?? '...'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Agencies</CardDescription>
            <CardTitle className="text-2xl">{agencyCount ?? '...'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link key={section.href} to={section.href}>
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn('rounded-lg p-2.5', section.bgColor)}>
                    <section.icon className={cn('h-5 w-5', section.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{section.label}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
