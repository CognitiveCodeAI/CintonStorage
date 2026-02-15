// UI token contract for operational, light-first surfaces.
// These values are intentionally minimal and map to CSS variables in index.css.

export const designTokens = {
  color: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    border: '#CBD5E1',
    text: '#1B2538',
    textMuted: '#566274',
    semantic: {
      success: '#1F7A44',
      warning: '#B45309',
      danger: '#BE123C',
      info: '#1D4ED8',
    },
  },
  spacing: {
    base: 4,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pagePadding: 20,
  },
  typography: {
    h1: 'text-2xl font-semibold',
    h2: 'text-lg font-semibold',
    body: 'text-sm font-normal',
    caption: 'text-xs font-medium',
  },
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
  },
  shadow: {
    none: 'none',
    subtle: '0 1px 2px rgba(15, 23, 42, 0.06)',
  },
} as const;

type StatusTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

export const statusStyles: Record<
  string,
  { label: string; tone: StatusTone; className: string }
> = {
  PENDING_INTAKE: {
    label: 'Pending',
    tone: 'warning',
    className: 'border border-warning/35 bg-warning-muted text-warning-foreground',
  },
  INTAKE_COMPLETE: {
    label: 'Intake Done',
    tone: 'info',
    className: 'border border-info/35 bg-info-muted text-info-foreground',
  },
  STORED: {
    label: 'Stored',
    tone: 'info',
    className: 'border border-info/35 bg-info-muted text-info-foreground',
  },
  HOLD: {
    label: 'Hold',
    tone: 'danger',
    className: 'border border-danger/35 bg-danger-muted text-danger-foreground',
  },
  RELEASE_ELIGIBLE: {
    label: 'Ready',
    tone: 'success',
    className: 'border border-success/35 bg-success-muted text-success-foreground',
  },
  RELEASED: {
    label: 'Released',
    tone: 'neutral',
    className: 'border border-border bg-surface-muted text-muted-foreground',
  },
  AUCTION_ELIGIBLE: {
    label: 'Auction',
    tone: 'warning',
    className: 'border border-warning/35 bg-warning-muted text-warning-foreground',
  },
  AUCTION_LISTED: {
    label: 'Listed',
    tone: 'warning',
    className: 'border border-warning/35 bg-warning-muted text-warning-foreground',
  },
  SOLD: {
    label: 'Sold',
    tone: 'success',
    className: 'border border-success/35 bg-success-muted text-success-foreground',
  },
  DISPOSED: {
    label: 'Disposed',
    tone: 'neutral',
    className: 'border border-border bg-surface-muted text-muted-foreground',
  },
};
