// Design tokens for Cinton Storage
// High-density, data-forward interface optimized for speed and accuracy

export const tokens = {
  colors: {
    // Vehicle status colors - strong, distinct colors for quick recognition
    status: {
      pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
      stored: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
      hold: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
      ready: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
      released: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
      auction: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    },
    // Semantic colors for alerts and feedback
    semantic: {
      success: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
      warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
      error: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
      info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    },
    // Money colors
    money: {
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-900 dark:text-gray-100',
    },
  },
  spacing: {
    section: 'space-y-6',
    card: 'p-4 sm:p-6',
    cardCompact: 'p-3 sm:p-4',
    stack: 'space-y-4',
    stackCompact: 'space-y-2',
    inline: 'space-x-4',
    inlineCompact: 'space-x-2',
  },
  typography: {
    pageTitle: 'text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100',
    sectionTitle: 'text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100',
    cardTitle: 'text-sm font-semibold text-gray-900 dark:text-gray-100',
    label: 'text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300',
    body: 'text-sm text-gray-600 dark:text-gray-400',
    bodySmall: 'text-xs text-gray-500 dark:text-gray-500',
    mono: 'font-mono text-sm',
    monoSmall: 'font-mono text-xs',
    stat: 'text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100',
    statLabel: 'text-xs sm:text-sm text-gray-500 dark:text-gray-400',
  },
  layout: {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    card: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
    cardInteractive: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer',
  },
  // Keyboard shortcut styling
  kbd: 'inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded',
};

// Status mapping for VehicleCaseStatus enum
export const statusStyles: Record<string, { label: string; className: string; icon?: string }> = {
  PENDING_INTAKE: {
    label: 'Pending',
    className: `${tokens.colors.status.pending.bg} ${tokens.colors.status.pending.text}`
  },
  INTAKE_COMPLETE: {
    label: 'Intake Done',
    className: `${tokens.colors.status.stored.bg} ${tokens.colors.status.stored.text}`
  },
  STORED: {
    label: 'Stored',
    className: `${tokens.colors.status.stored.bg} ${tokens.colors.status.stored.text}`
  },
  HOLD: {
    label: 'Hold',
    className: `${tokens.colors.status.hold.bg} ${tokens.colors.status.hold.text}`
  },
  RELEASE_ELIGIBLE: {
    label: 'Ready',
    className: `${tokens.colors.status.ready.bg} ${tokens.colors.status.ready.text}`
  },
  RELEASED: {
    label: 'Released',
    className: `${tokens.colors.status.released.bg} ${tokens.colors.status.released.text}`
  },
  AUCTION_ELIGIBLE: {
    label: 'Auction',
    className: `${tokens.colors.status.auction.bg} ${tokens.colors.status.auction.text}`
  },
  AUCTION_LISTED: {
    label: 'Listed',
    className: `${tokens.colors.status.auction.bg} ${tokens.colors.status.auction.text}`
  },
  SOLD: {
    label: 'Sold',
    className: `${tokens.colors.status.ready.bg} ${tokens.colors.status.ready.text}`
  },
  DISPOSED: {
    label: 'Disposed',
    className: `${tokens.colors.status.released.bg} ${tokens.colors.status.released.text}`
  },
};
