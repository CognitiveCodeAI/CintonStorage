import { Link, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react';

const attentionTone = {
  info: {
    rowClass: 'border-l-info bg-info-muted/50 hover:bg-info-muted/80',
    pillClass: 'bg-info/10 text-info ring-1 ring-inset ring-info/20',
    label: 'Ready',
  },
  warning: {
    rowClass: 'border-l-warning bg-warning-muted/50 hover:bg-warning-muted/80',
    pillClass: 'bg-warning/10 text-warning-foreground ring-1 ring-inset ring-warning/20',
    label: 'Monitor',
  },
  error: {
    rowClass: 'border-l-danger bg-danger-muted/50 hover:bg-danger-muted/80',
    pillClass: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20',
    label: 'Action',
  },
} as const;

export default function DashboardPage() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card className="xl:col-span-2"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Stored',
      value: stats?.totalStored || 0,
      icon: Car,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'border-l-info',
      glowHover: 'hover:shadow-glow-primary',
      href: '/cases?status=STORED',
      description: 'Vehicles in lot',
    },
    {
      label: 'Ready',
      value: stats?.readyToRelease || 0,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-l-success',
      glowHover: 'hover:shadow-glow-success',
      href: '/cases?status=RELEASE_ELIGIBLE',
      description: 'Release eligible',
      urgent: (stats?.readyToRelease || 0) > 0,
    },
    {
      label: 'On Hold',
      value: stats?.onHold || 0,
      icon: AlertTriangle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-l-danger',
      glowHover: 'hover:shadow-glow-danger',
      href: '/cases?status=HOLD',
      description: 'Police/lien holds',
      urgent: (stats?.onHold || 0) > 0,
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-l-success',
      glowHover: 'hover:shadow-glow-success',
      href: '/cases',
      description: "Today's total",
    },
  ];

  const needsAttention: Array<{ id: string; message: string; type: 'warning' | 'error' | 'info'; href: string }> = [];
  if (stats?.readyToRelease && stats.readyToRelease > 0) needsAttention.push({ id: 'ready-release', message: `${stats.readyToRelease} vehicle${stats.readyToRelease > 1 ? 's' : ''} ready for release`, type: 'info', href: '/cases?status=RELEASE_ELIGIBLE' });
  if (stats?.auctionEligible && stats.auctionEligible > 0) needsAttention.push({ id: 'auction-eligible', message: `${stats.auctionEligible} vehicle${stats.auctionEligible > 1 ? 's' : ''} eligible for auction`, type: 'warning', href: '/cases?status=AUCTION_ELIGIBLE' });
  if (stats?.pendingIntake && stats.pendingIntake > 0) needsAttention.push({ id: 'pending-intake', message: `${stats.pendingIntake} pending intake${stats.pendingIntake > 1 ? 's' : ''} to complete`, type: 'error', href: '/cases?status=PENDING_INTAKE' });

  const recentActivity = [
    { time: '10:32 AM', action: 'New intake: 2021 Honda Accord', type: 'intake' as const },
    { time: '9:15 AM', action: 'Payment received: $450.00', type: 'payment' as const },
    { time: 'Yesterday', action: 'Vehicle released: 2019 Ford Fusion', type: 'release' as const },
    { time: 'Yesterday', action: 'New intake: 2020 Toyota Camry', type: 'intake' as const },
  ];

  const activityDot: Record<string, string> = {
    intake: 'bg-primary',
    payment: 'bg-success',
    release: 'bg-info',
  };

  const quickActions = [
    { icon: ClipboardList, label: 'New Intake', href: '/intake/new', color: 'text-primary', hoverBg: 'group-hover:bg-primary/8' },
    { icon: Search, label: 'Search', action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' })), color: 'text-muted-foreground', hoverBg: 'group-hover:bg-muted' },
    { icon: CheckCircle, label: 'Release', href: '/cases?status=RELEASE_ELIGIBLE', color: 'text-success', hoverBg: 'group-hover:bg-success/8' },
    { icon: AlertTriangle, label: 'Holds', href: '/cases?status=HOLD', color: 'text-danger', hoverBg: 'group-hover:bg-danger/8' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ops-page-title">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Operational control view for intake throughput, holds, and release readiness.
          </p>
        </div>
        <Button onClick={() => navigate('/intake/new')} size="lg" className="gap-2 sm:w-auto">
          <ClipboardList className="h-4 w-4" />
          New Intake
        </Button>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-surface shadow-elevation-2">
        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr]">
          <div className="p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Command Center</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Keep lot operations moving with fewer misses.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Priority alerts, live status, and one-click actions are consolidated below for faster dispatch decisions.
            </p>
          </div>
          <div className="border-l border-border/80">
            <img
              src="/ops-yard-illustration.svg"
              alt="Operational dashboard illustration"
              className="h-full max-h-40 w-full object-cover xl:max-h-none"
            />
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.href}
              className={`group relative overflow-hidden rounded-xl border border-l-[3px] bg-card p-4 transition-all duration-200 hover:shadow-elevation-2 ${stat.borderColor} ${stat.glowHover}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              {stat.urgent && (
                <span className="absolute right-2 top-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                </span>
              )}
              <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      {/* Needs Attention + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-danger/10">
                <Siren className="h-4 w-4 text-danger" />
              </div>
              Needs Attention
              {needsAttention.length > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger/10 px-1.5 text-2xs font-bold text-danger">
                  {needsAttention.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-success-muted/60 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">All clear</p>
                  <p className="text-xs text-muted-foreground">No urgent items right now</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {needsAttention.map((item) => {
                  const style = attentionTone[item.type];
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={`group flex items-center justify-between rounded-lg border-l-[3px] px-4 py-3 transition-all duration-150 ${style.rowClass}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style.pillClass}`}>
                          {style.label}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">{item.message}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="mt-[5px] flex h-2 w-2 flex-shrink-0 rounded-full" >
                    <span className={`h-2 w-2 rounded-full ${activityDot[activity.type] || 'bg-muted-foreground'}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{activity.action}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t pt-3">
              <Link to="/cases" className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80">
                View all activity
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Stats sidebar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((qa) => {
                const Icon = qa.icon;
                const inner = (
                  <>
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 transition-colors duration-200 ${qa.hoverBg}`}>
                      <Icon className={`h-5 w-5 ${qa.color} transition-transform duration-200 group-hover:scale-110`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{qa.label}</span>
                  </>
                );
                return qa.action ? (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className="group flex flex-col items-center rounded-xl border border-transparent bg-card p-4 transition-all duration-200 hover:border-primary/25 hover:shadow-elevation-2"
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    key={qa.label}
                    to={qa.href!}
                    className="group flex flex-col items-center rounded-xl border border-transparent bg-card p-4 transition-all duration-200 hover:border-primary/25 hover:shadow-elevation-2"
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success/10">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-success" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                  </span>
                  <span className="text-sm font-medium text-foreground">All systems operational</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last sync: Just now</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New intakes</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">2</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vehicles released</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">1</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payments received</span>
                  <span className="text-sm font-semibold tabular-nums text-success">{formatCurrency(stats?.todayRevenue || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
