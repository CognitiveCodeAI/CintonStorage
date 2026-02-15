import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  Users,
  Shield,
  Building2,
  DollarSign,
  MapPin,
  Settings,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const adminNavItems = [
  { href: '/admin/users', label: 'Users', icon: Users, description: 'Manage user accounts' },
  { href: '/admin/roles', label: 'Roles', icon: Shield, description: 'Configure roles & permissions' },
  { href: '/admin/agencies', label: 'Agencies', icon: Building2, description: 'Manage towing agencies' },
  { href: '/admin/fees', label: 'Fee Schedule', icon: DollarSign, description: 'Configure fee amounts' },
  { href: '/admin/yard', label: 'Yard Locations', icon: MapPin, description: 'Manage lot layout' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, description: 'System configuration' },
];

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  useAuth(); // Ensure user is authenticated
  const location = useLocation();

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/admin" className="hover:text-foreground transition-colors">
          Admin
        </Link>
        {location.pathname !== '/admin' && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{title}</span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-20">
            <div className="mb-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back to App
                </Button>
              </Link>
            </div>
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div>{item.label}</div>
                      <div className={cn(
                        'text-xs font-normal',
                        isActive ? 'text-primary/70' : 'text-muted-foreground/70'
                      )}>
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="ops-page-title">{title}</h1>
            {description && <p className="ops-page-subtitle mt-1">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
