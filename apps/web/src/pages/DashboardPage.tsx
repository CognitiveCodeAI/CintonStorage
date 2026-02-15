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
  Siren,
} from 'lucide-react';

const attentionTone = {
  info: {
    rowClass: 'border-info/45 bg-info-muted',
    labelClass: 'text-info-foreground border-info/45 bg-white/70',
    label: 'Ready',
  },
  warning: {
    rowClass: 'border-warning/45 bg-warning-muted',
    labelClass: 'text-warning-foreground border-warning/45 bg-white/70',
    label: 'Monitor',
  },
  error: {
    rowClass: 'border-danger/50 bg-danger-muted',
    labelClass: 'text-danger-foreground border-danger/50 bg-white/70',
    label: 'Action',
  },
} as const;

export default function DashboardPage() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="ops-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="mb-2 h-8 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Stored',
      value: stats?.totalStored || 0,
      icon: Car,
      iconClass: 'border-info/45 bg-info-muted text-info-foreground',
      accent: 'bg-info',
      href: '/cases?status=STORED',
      description: 'Vehicles in lot',
    },
    {
      label: 'Ready',
      value: stats?.readyToRelease || 0,
      icon: CheckCircle,
      iconClass: 'border-success/45 bg-success-muted text-success-foreground',
      accent: 'bg-success',
      href: '/cases?status=RELEASE_ELIGIBLE',
      description: 'Release eligible',
      urgent: (stats?.readyToRelease || 0) > 0,
    },
    {
      label: 'On Hold',
      value: stats?.onHold || 0,
      icon: AlertTriangle,
      iconClass: 'border-danger/50 bg-danger-muted text-danger-foreground',
      accent: 'bg-danger',
      href: '/cases?status=HOLD',
      description: 'Police/lien holds',
      urgent: (stats?.onHold || 0) > 0,
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      iconClass: 'border-success/45 bg-success-muted text-success-foreground',
      accent: 'bg-success',
      href: '/cases',
      description: "Today's total",
      isMonetary: true,
    },
  ];

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

  const recentActivity = [
    { time: '10:32 AM', action: 'New intake: 2021 Honda Accord', type: 'intake' },
    { time: '9:15 AM', action: 'Payment received: $450.00', type: 'payment' },
    { time: 'Yesterday', action: 'Vehicle released: 2019 Ford Fusion', type: 'release' },
    { time: 'Yesterday', action: 'New intake: 2020 Toyota Camry', type: 'intake' },
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="ops-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="ops-page-title">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Operational view for intake, holds, release readiness, and lot throughput.
              </p>
            </div>
            <Button onClick={() => navigate('/intake/new')} className="sm:w-auto">
              <ClipboardList className="mr-2 h-4 w-4" />
              New Intake
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  to={stat.href}
                  className="group relative overflow-hidden rounded-lg border border-border bg-surface p-3 transition-colors hover:border-ring hover:bg-surface-muted"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${stat.accent}`} aria-hidden="true" />
                  {stat.urgent && (
                    <span className="absolute right-2 top-2 inline-flex items-center rounded border border-danger/45 bg-danger-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger-foreground">
                      Action
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                      <p className="mt-0.5 truncate text-2xl font-semibold text-foreground">{stat.value}</p>
                      <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{stat.description}</p>
                    </div>
                    <div className={`rounded-md border p-2 ${stat.iconClass}`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>

                  <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="ops-surface overflow-hidden">
          <img
            src="/ops-yard-illustration.svg"
            alt="Lot operations overview"
            className="h-36 w-full border-b border-border object-cover"
          />
          <div className="space-y-2 p-4">
            <h2 className="text-sm font-semibold text-foreground">Live Lot Snapshot</h2>
            <p className="text-sm text-muted-foreground">
              Monitor case flow, hold pressure, and release opportunities in one place.
            </p>
            <Link
              to="/cases"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open case board
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card padding="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-danger" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <div className="rounded-md border border-success/45 bg-success-muted px-3 py-2 text-sm text-success-foreground">
                No urgent items right now.
              </div>
            ) : (
              <div className="space-y-2">
                {needsAttention.map((item) => {
                  const style = attentionTone[item.type];
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={`group flex items-center justify-between rounded-md border-l-2 px-3 py-2.5 transition-colors hover:opacity-90 ${style.rowClass}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.labelClass}`}
                        >
                          {style.label}
                        </span>
                        <span className="truncate text-sm text-foreground">{item.message}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const dotClass =
                  activity.type === 'payment'
                    ? 'bg-success'
                    : activity.type === 'release'
                    ? 'bg-info'
                    : 'bg-primary';
                return (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <span className="w-16 flex-shrink-0 pt-0.5 text-xs text-muted-foreground">{activity.time}</span>
                    <span className={`mt-[0.38rem] inline-flex h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
                    <span className="text-foreground">{activity.action}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <Link to="/cases" className="flex items-center gap-1 text-sm text-primary hover:underline">
                View all activity
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card padding="sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Link
                to="/intake/new"
                className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:border-primary hover:bg-info-muted"
              >
                <ClipboardList className="mb-2 h-7 w-7 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">New Intake</span>
              </Link>
              <button
                onClick={() => {
                  document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
                }}
                className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:border-primary hover:bg-info-muted"
              >
                <Search className="mb-2 h-7 w-7 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Search</span>
              </button>
              <Link
                to="/cases?status=RELEASE_ELIGIBLE"
                className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:border-success hover:bg-success-muted"
              >
                <CheckCircle className="mb-2 h-7 w-7 text-success transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Release</span>
              </Link>
              <Link
                to="/cases?status=HOLD"
                className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:border-danger hover:bg-danger-muted"
              >
                <AlertTriangle className="mb-2 h-7 w-7 text-danger transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Holds</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card padding="sm">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                  <span className="text-foreground">All systems operational</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last sync: Just now</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <span className="text-muted-foreground">New intakes</span>
                  <span className="font-semibold text-foreground">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicles released</span>
                  <span className="font-semibold text-foreground">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payments received</span>
                  <span className="font-semibold text-success">{formatCurrency(stats?.todayRevenue || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
