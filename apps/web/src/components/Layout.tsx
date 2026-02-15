import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { Button, buttonVariants } from './ui/Button';
import { Kbd } from './ui/Kbd';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  LogOut,
  Menu,
  Search,
  Keyboard,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onSearchOpen: () => setSearchOpen(true),
    onHelpOpen: () => setHelpOpen(true),
  });

  return (
    <div className="min-h-screen ops-shell-bg">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-primary focus:rounded-md focus:border focus:border-border focus:outline-none focus:ring-2 focus:ring-ring">
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1540px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 font-semibold text-foreground">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="hidden text-sm sm:inline">Cinton Storage</span>
            </Link>

            <div className="hidden h-5 w-px bg-border md:block" />

            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const active = isActiveRoute(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                    title={`${item.label} (${item.shortcut})`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              className="hidden md:inline-flex justify-between min-w-[320px] text-muted-foreground font-normal h-8 rounded-lg text-xs"
              onClick={() => setSearchOpen(true)}
              aria-label="Search by VIN, plate, or case number"
            >
              <span className="inline-flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                Search VIN, plate, case #
              </span>
              <Kbd>/</Kbd>
            </Button>
            <Button variant="outline" size="icon" className="md:hidden h-8 w-8" onClick={() => setSearchOpen(true)} aria-label="Search"><Search className="h-3.5 w-3.5" /></Button>
            <ThemeToggle />
            <Button variant="outline" size="icon" className="hidden sm:inline-flex h-8 w-8" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)"><Keyboard className="h-3.5 w-3.5" /></Button>

            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 font-normal">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <span className="max-w-24 truncate text-xs">{user?.name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden h-8 w-8" aria-label="Toggle menu"><Menu className="h-4 w-4" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-3/4">
                <div className="space-y-3 py-6">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link to={item.href} className={cn(buttonVariants({ variant: isActiveRoute(location.pathname, item.href) ? 'secondary' : 'ghost' }), 'w-full justify-start gap-3 text-base')}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="absolute bottom-4 left-4 right-4 space-y-2">
                    <div className="border-t pt-4">
                      <p className="px-3 text-sm font-medium">{user?.name}</p>
                      <p className="px-3 text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <SheetClose asChild>
                      <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}><LogOut className="h-5 w-5" /><span>Logout</span></Button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8" role="main" tabIndex={-1}>
        {children}
      </main>

      <SearchBar isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <KeyboardShortcutsHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
