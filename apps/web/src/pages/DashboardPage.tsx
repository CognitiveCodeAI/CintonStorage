import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { formatCurrency } from '../lib/utils';
import {
  Car,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Vehicles Stored',
      value: stats?.totalStored || 0,
      icon: Car,
      color: 'bg-blue-500',
    },
    {
      label: 'Ready to Release',
      value: stats?.readyToRelease || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      label: 'On Hold',
      value: stats?.onHold || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: 'bg-emerald-500',
      isMonetary: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/intake/new" className="btn-primary">
          <ClipboardList className="h-4 w-4 mr-2" />
          New Intake
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stat.isMonetary ? stat.value : stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/intake/new"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-colors"
          >
            <ClipboardList className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">New Intake</span>
          </Link>
          <Link
            to="/cases"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-colors"
          >
            <Car className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">View Cases</span>
          </Link>
          <Link
            to="/cases?status=RELEASE_ELIGIBLE"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
            <span className="text-sm font-medium">Ready for Release</span>
          </Link>
          <Link
            to="/cases?status=HOLD"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <span className="text-sm font-medium">On Hold</span>
          </Link>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Actions</h2>
          <div className="space-y-3">
            {stats?.pendingIntake ? (
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-md">
                <span className="text-sm">Pending Intake</span>
                <span className="font-semibold text-amber-700">
                  {stats.pendingIntake}
                </span>
              </div>
            ) : null}
            {stats?.auctionEligible ? (
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-md">
                <span className="text-sm">Auction Eligible</span>
                <span className="font-semibold text-purple-700">
                  {stats.auctionEligible}
                </span>
              </div>
            ) : null}
            {!stats?.pendingIntake && !stats?.auctionEligible && (
              <p className="text-gray-500 text-sm">No pending actions</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-sm">All systems operational</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                Last sync: Just now
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
