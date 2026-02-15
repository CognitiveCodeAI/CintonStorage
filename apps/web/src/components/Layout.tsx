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
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { href: '/cases', label: 'Cases', icon: Car, shortcut: 'G C' },
  { href: '/intake/new', label: 'New Intake', icon: ClipboardList, shortcut: 'N' },
];

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-lg font-bold tracking-tight">
                Cinton Storage
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20'
                        : 'hover:bg-white/10'
                    }`}
                    title={`${item.label} (${item.shortcut})`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              {/* Search button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
                <span className="text-white/70">Search...</span>
                <Kbd className="bg-white/10 border-white/20 text-white/70">/</Kbd>
              </button>

              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="sm:hidden p-2 hover:bg-white/10 rounded-md"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Keyboard shortcuts help */}
              <button
                onClick={() => setHelpOpen(true)}
                className="hidden sm:flex p-2 hover:bg-white/10 rounded-md"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="h-5 w-5" />
              </button>

              {/* User menu (desktop) */}
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm">{user?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {user?.email}
                        </div>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 hover:bg-white/10 rounded-md"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-white/20'
                        : 'hover:bg-white/10'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="px-3 py-2 text-sm text-white/70">
                  {user?.name} ({user?.email})
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium hover:bg-white/10 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
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
