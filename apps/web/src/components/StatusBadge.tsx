import { VehicleCaseStatus } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gavel,
  Package,
  XCircle,
} from 'lucide-react';
import { statusStyles } from '../styles/tokens';

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING_INTAKE: Clock3,
  INTAKE_COMPLETE: Package,
  STORED: Package,
  HOLD: AlertTriangle,
  RELEASE_ELIGIBLE: CheckCircle2,
  RELEASED: XCircle,
  AUCTION_ELIGIBLE: Gavel,
  AUCTION_LISTED: Gavel,
  SOLD: CheckCircle2,
  DISPOSED: XCircle,
};

interface StatusBadgeProps {
  status: VehicleCaseStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusStyles[status] || {
    label: status,
    className: 'border border-border bg-surface-muted text-muted-foreground',
  };
  const Icon = statusIcons[status];

  const sizeClasses = {
    sm: 'gap-1 px-1.5 py-0.5 text-[11px]',
    md: 'gap-1.5 px-2 py-0.5 text-xs',
    lg: 'gap-1.5 px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold tracking-wide ${config.className} ${sizeClasses[size]}`}
      data-status={status}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {config.label}
    </span>
  );
}
