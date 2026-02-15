import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { Kbd } from './ui/Kbd';
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Search,
  Keyboard,
  ChevronDown,
  Building2,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { href: '/cases', label: 'Cases', icon: Car, shortcut: 'G C' },
  { href: '/intake/new', label: 'New Intake', icon: ClipboardList, shortcut: 'N' },
];

const isActiveRoute = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  if (href === '/cases') return pathname.startsWith('/cases');
  if (href === '/intake/new') return pathname.startsWith('/intake');
  return pathname === href;
};

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onSearchOpen: () => setSearchOpen(true),
    onHelpOpen: () => setHelpOpen(true),
  });

  return (
    <div className="min-h-screen ops-shell-bg">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-primary focus:rounded-md focus:border focus:border-border focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/90 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1540px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-muted">
                <Building2 className="h-4 w-4 text-primary" />
              </span>
              <span className="hidden sm:inline">Cinton Storage</span>
              <span className="sm:hidden">Cinton</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'border-transparent text-foreground hover:border-border hover:bg-surface-muted'
                    }`}
                    title={`${item.label} (${item.shortcut})`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex h-10 min-w-[360px] items-center justify-between rounded-md border border-input bg-surface px-3 text-sm text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-ring hover:bg-surface-muted"
              aria-label="Search by VIN, plate, or case number"
            >
              <span className="inline-flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search VIN, plate, case #
              </span>
              <Kbd>/</Kbd>
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-surface text-muted-foreground transition-colors hover:border-ring hover:bg-surface-muted hover:text-foreground md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            <ThemeToggle />

            <button
              onClick={() => setHelpOpen(true)}
              className="hidden h-10 w-10 items-center justify-center rounded-md border border-input bg-surface text-muted-foreground transition-colors hover:border-ring hover:bg-surface-muted hover:text-foreground sm:inline-flex"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            <div className="hidden md:block relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-foreground transition-colors hover:border-ring hover:bg-surface-muted"
              >
                <span className="max-w-28 truncate">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                      {user?.email}
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-surface text-muted-foreground hover:border-ring hover:bg-surface-muted hover:text-foreground md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border bg-surface md:hidden">
            <div className="space-y-1 px-3 py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-transparent text-foreground hover:border-border hover:bg-surface-muted'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-border pt-2">
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {user?.name} ({user?.email})
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8"
        role="main"
        tabIndex={-1}
      >
        {children}
      </main>

      {/* Search Modal */}
      <SearchBar isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
