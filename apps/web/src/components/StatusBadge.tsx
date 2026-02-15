import { VehicleCaseStatus } from '@cinton/shared';

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING_INTAKE: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  INTAKE_COMPLETE: { label: 'Intake Done', className: 'bg-blue-100 text-blue-800' },
  STORED: { label: 'Stored', className: 'bg-blue-100 text-blue-800' },
  HOLD: { label: 'Hold', className: 'bg-red-100 text-red-800' },
  RELEASE_ELIGIBLE: { label: 'Ready', className: 'bg-green-100 text-green-800' },
  RELEASED: { label: 'Released', className: 'bg-gray-100 text-gray-800' },
  AUCTION_ELIGIBLE: { label: 'Auction', className: 'bg-purple-100 text-purple-800' },
  AUCTION_LISTED: { label: 'Listed', className: 'bg-purple-100 text-purple-800' },
  SOLD: { label: 'Sold', className: 'bg-green-100 text-green-800' },
  DISPOSED: { label: 'Disposed', className: 'bg-gray-100 text-gray-800' },
};

interface StatusBadgeProps {
  status: VehicleCaseStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses[size]}`}
    >
      {config.label}
    </span>
  );
}
