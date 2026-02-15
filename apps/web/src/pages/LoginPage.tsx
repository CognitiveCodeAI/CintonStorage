import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Car } from 'lucide-react';

// Show demo credentials only in development/demo mode
const SHOW_DEMO_CREDENTIALS = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 border-r border-border bg-primary text-primary-foreground p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <Car className="h-8 w-8" />
            </div>
            <span className="text-2xl font-bold">Cinton Storage</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Impound Lot Management
            <br />
            Made Simple
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Track vehicles, manage fees, and streamline releases with our comprehensive lot management system.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/70">Vehicles Managed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-white/70">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">5min</div>
              <div className="text-sm text-white/70">Avg. Intake Time</div>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/60">
          &copy; {new Date().getFullYear()} Cinton Storage. All rights reserved.
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="rounded-xl bg-primary p-3">
                <Car className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Cinton Storage</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Impound Lot Management System
            </p>
          </div>

          {/* Login card */}
          <div className="rounded-xl border border-border bg-surface p-8 shadow-none">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="mt-1 text-right">
                  <a
                    href="#"
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      // Placeholder for forgot password flow
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              {error && (
                <Alert variant="error" onDismiss={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                loading={isLoading}
                className="w-full"
                size="lg"
              >
                Sign in
              </Button>
            </form>

            {/* Demo credentials (only in dev/demo mode) */}
            {SHOW_DEMO_CREDENTIALS && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Demo credentials:
                </p>
                <div className="rounded-md border border-border bg-surface-muted p-3 text-center">
                  <code className="text-sm text-foreground">
                    admin@cinton.com / admin123
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@cinton.com');
                    setPassword('admin123');
                  }}
                  className="w-full mt-2 text-xs text-primary hover:underline"
                >
                  Auto-fill demo credentials
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
