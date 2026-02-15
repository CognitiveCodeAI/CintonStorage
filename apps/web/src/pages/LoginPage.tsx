import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden border-r border-border bg-primary text-primary-foreground lg:flex lg:w-[52%]">
        <div className="flex w-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/25 bg-white/10 p-2.5">
              <Car className="h-7 w-7" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">Cinton Storage</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">Operational Control System</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight">
                Intake, holds, release, and case flow in one command center.
              </h1>
            </div>

            <p className="max-w-lg text-lg text-white/82">
              Built for speed under pressure. Scan faster, reduce misses, and keep lot operations moving.
            </p>

            <div className="overflow-hidden rounded-lg border border-white/20 bg-white/5">
              <img
                src="/ops-yard-illustration.svg"
                alt="Impound lot operations board"
                className="h-56 w-full object-cover"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-md border border-white/15 bg-white/8 px-3 py-2.5 text-center">
                <div className="text-2xl font-semibold">500+</div>
                <div className="text-xs text-white/75">Vehicles Managed</div>
              </div>
              <div className="rounded-md border border-white/15 bg-white/8 px-3 py-2.5 text-center">
                <div className="text-2xl font-semibold">24/7</div>
                <div className="text-xs text-white/75">System Uptime</div>
              </div>
              <div className="rounded-md border border-white/15 bg-white/8 px-3 py-2.5 text-center">
                <div className="text-2xl font-semibold">5m</div>
                <div className="text-xs text-white/75">Avg Intake</div>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/65">
            &copy; {new Date().getFullYear()} Cinton Storage. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="rounded-lg border border-primary/25 bg-primary p-3">
                <Car className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Cinton Storage</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Impound Lot Management System
            </p>
          </div>

          {/* Login card */}
          <Card className="shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                Welcome back
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Alert variant="destructive">
                    <AlertTitle>Login Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
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
            </CardContent>

            {/* Demo credentials (only in dev/demo mode) */}
            {SHOW_DEMO_CREDENTIALS && (
              <CardFooter className="flex-col pt-6 border-t mt-6">
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
              </CardFooter>
            )}
          </Card>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
