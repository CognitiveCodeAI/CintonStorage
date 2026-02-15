import { Link, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import {
  Car,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  ClipboardList,
  Search,
  ArrowRight,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-3 w-24 hidden sm:block" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Stored',
      value: stats?.totalStored || 0,
      icon: Car,
      tone: 'info',
      iconClass: 'border border-info/40 bg-info-muted text-info-foreground',
      href: '/cases?status=STORED',
      description: 'Vehicles in lot',
    },
    {
      label: 'Ready',
      value: stats?.readyToRelease || 0,
      icon: CheckCircle,
      tone: 'success',
      iconClass: 'border border-success/40 bg-success-muted text-success-foreground',
      href: '/cases?status=RELEASE_ELIGIBLE',
      description: 'Release eligible',
      urgent: (stats?.readyToRelease || 0) > 0,
    },
    {
      label: 'On Hold',
      value: stats?.onHold || 0,
      icon: AlertTriangle,
      tone: 'danger',
      iconClass: 'border border-danger/40 bg-danger-muted text-danger-foreground',
      href: '/cases?status=HOLD',
      description: 'Police/lien holds',
      urgent: (stats?.onHold || 0) > 0,
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      tone: 'success',
      iconClass: 'border border-success/40 bg-success-muted text-success-foreground',
      href: '/cases',
      description: "Today's total",
      isMonetary: true,
    },
  ];

  // Build needs attention items
  const needsAttention: Array<{
    id: string;
    message: string;
    type: 'warning' | 'error' | 'info';
    href: string;
  }> = [];

  if (stats?.readyToRelease && stats.readyToRelease > 0) {
    needsAttention.push({
      id: 'ready-release',
      message: `${stats.readyToRelease} vehicle${stats.readyToRelease > 1 ? 's' : ''} ready for release`,
      type: 'info',
      href: '/cases?status=RELEASE_ELIGIBLE',
    });
  }

  if (stats?.auctionEligible && stats.auctionEligible > 0) {
    needsAttention.push({
      id: 'auction-eligible',
      message: `${stats.auctionEligible} vehicle${stats.auctionEligible > 1 ? 's' : ''} eligible for auction`,
      type: 'warning',
      href: '/cases?status=AUCTION_ELIGIBLE',
    });
  }

    if (stats?.pendingIntake && stats.pendingIntake > 0) {
    needsAttention.push({
      id: 'pending-intake',
      message: `${stats.pendingIntake} pending intake${stats.pendingIntake > 1 ? 's' : ''} to complete`,
      type: 'error',
      href: '/cases?status=PENDING_INTAKE',
    });
  }

  const attentionStyles: Record<
    'warning' | 'error' | 'info',
    { rowClass: string; labelClass: string; label: string }
  > = {
    info: {
      rowClass: 'border-info/45 bg-info-muted',
      labelClass: 'text-info-foreground',
      label: 'Ready',
    },
    warning: {
      rowClass: 'border-warning/45 bg-warning-muted',
      labelClass: 'text-warning-foreground',
      label: 'Monitor',
    },
    error: {
      rowClass: 'border-danger/45 bg-danger-muted',
      labelClass: 'text-danger-foreground',
      label: 'Action',
    },
  };

  // Mock recent activity (in a real app, this would come from the API)
  const recentActivity = [
    { time: '10:32 AM', action: 'New intake: 2021 Honda Accord', type: 'intake' },
    { time: '9:15 AM', action: 'Payment received: $450.00', type: 'payment' },
    { time: 'Yesterday', action: 'Vehicle released: 2019 Ford Fusion', type: 'release' },
    { time: 'Yesterday', action: 'New intake: 2020 Toyota Camry', type: 'intake' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="ops-page-title">
            Dashboard
          </h1>
          <p className="ops-page-subtitle mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Button onClick={() => navigate('/intake/new')} className="sm:w-auto">
          <ClipboardList className="h-4 w-4 mr-2" />
          New Intake
        </Button>
      </div>

      {/* Stats Grid - High density, clickable cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.href}
              className="group relative rounded-lg border border-border bg-surface p-3.5 transition-colors hover:bg-surface-muted hover:border-ring"
            >
              {stat.urgent && (
                <span className="absolute top-2 right-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border border-danger/45 bg-danger-muted text-danger-foreground">
                  Action
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-xl sm:text-2xl font-semibold text-foreground truncate">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 rounded-md p-2 ${stat.iconClass}`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>

              <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Needs Attention + Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <Card padding="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {needsAttention.map((item) => {
                    const style = attentionStyles[item.type];
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        className={`group flex items-center justify-between rounded-md border-l-2 px-3 py-2.5 transition-colors hover:opacity-90 ${style.rowClass}`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`inline-flex rounded border border-current/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.labelClass}`}>
                            {style.label}
                          </span>
                          <span className="truncate text-sm text-foreground">
                            {item.message}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Link
                  to="/intake/new"
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border hover:border-ring hover:bg-surface-muted transition-colors group"
                >
                  <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium text-center">
                    New Intake
                  </span>
                </Link>
                <button
                  onClick={() => {
                    // This would open the search modal
                    document.dispatchEvent(
                      new KeyboardEvent('keydown', { key: '/' })
                    );
                  }}
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border hover:border-ring hover:bg-surface-muted transition-colors group"
                >
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium text-center">
                    Search
                  </span>
                </button>
                <Link
                  to="/cases?status=RELEASE_ELIGIBLE"
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border hover:border-success/65 hover:bg-success-muted transition-colors group"
                >
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-success mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium text-center">
                    Release
                  </span>
                </Link>
                <Link
                  to="/cases?status=HOLD"
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border hover:border-danger/65 hover:bg-danger-muted transition-colors group"
                >
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-danger mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium text-center">
                    Holds
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Recent Activity + System Status */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="w-16 flex-shrink-0 pt-0.5 text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                    <span className="text-foreground">
                      {activity.action}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <Link
                  to="/cases"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View all activity
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-success" />
                  <span className="text-sm text-foreground">
                    All systems operational
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last sync: Just now</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    New intakes
                  </span>
                  <span className="font-medium text-foreground">
                    2
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Vehicles released
                  </span>
                  <span className="font-medium text-foreground">
                    1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Payments received
                  </span>
                  <span className="font-medium text-success">
                    {formatCurrency(stats?.todayRevenue || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
