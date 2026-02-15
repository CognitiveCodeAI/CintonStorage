import { Link, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import {
  Car,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  ClipboardList,
  Search,
  CreditCard,
  ArrowRight,
  Calendar,
  TrendingUp,
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
      color: 'bg-blue-500',
      href: '/cases?status=STORED',
      description: 'Vehicles in lot',
    },
    {
      label: 'Ready',
      value: stats?.readyToRelease || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      href: '/cases?status=RELEASE_ELIGIBLE',
      description: 'Release eligible',
      urgent: (stats?.readyToRelease || 0) > 0,
    },
    {
      label: 'On Hold',
      value: stats?.onHold || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      href: '/cases?status=HOLD',
      description: 'Police/lien holds',
      urgent: (stats?.onHold || 0) > 0,
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: 'bg-emerald-500',
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
      type: 'warning',
      href: '/cases?status=PENDING_INTAKE',
    });
  }

  // Mock recent activity (in a real app, this would come from the API)
  const recentActivity = [
    { time: '10:32 AM', action: 'New intake: 2021 Honda Accord', type: 'intake' },
    { time: '9:15 AM', action: 'Payment received: $450.00', type: 'payment' },
    { time: 'Yesterday', action: 'Vehicle released: 2019 Ford Fusion', type: 'release' },
    { time: 'Yesterday', action: 'New intake: 2020 Toyota Camry', type: 'intake' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
              className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-primary dark:hover:border-primary transition-colors"
            >
              {/* Urgent indicator */}
              {stat.urgent && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}

              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {stat.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`${stat.color} p-2 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>

              {/* Hover arrow */}
              <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {needsAttention.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {item.message}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </Link>
                  ))}
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
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
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
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                >
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium text-center">
                    Search
                  </span>
                </button>
                <Link
                  to="/cases?status=RELEASE_ELIGIBLE"
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group"
                >
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium text-center">
                    Release
                  </span>
                </Link>
                <Link
                  to="/cases?status=HOLD"
                  className="flex flex-col items-center p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                >
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
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
                <Clock className="h-5 w-5 text-gray-400" />
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
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0 pt-0.5">
                      {activity.time}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {activity.action}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to="/cases"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
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
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    All systems operational
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
                <Calendar className="h-5 w-5 text-gray-400" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    New intakes
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    2
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Vehicles released
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Payments received
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
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
