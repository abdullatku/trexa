import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TrexaLogo } from '../ui/logo';
import { toast } from 'sonner';
import { OAuthButtons } from '../auth/OAuthButtons';
import { Eye, EyeOff } from 'lucide-react';

export function SignInPage() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Redirect based on user role
      if (user.role === 'student') {
        navigate('/student');
      } else if (user.role === 'interviewer') {
        navigate('/interviewer');
      } else if (user.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Signed in successfully!');
      // Navigation will be handled by the useEffect in LandingPage after user state updates
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrexaLogo className="h-10 text-indigo-600" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="border-input bg-input-background focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center rounded-md border transition-[color,box-shadow] focus-within:ring-[3px]">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                    required
                  />
                  <button
                    type="button"
                    className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
              <div className="h-px flex-1 bg-gray-200" />
              <span>or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <OAuthButtons />

            <div className="mt-4 text-center text-sm">
              <Link to="/forgot-password" className="text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600">Don&apos;t have an account? </span>
              <Link to="/signup" className="text-indigo-600 hover:underline">
                Sign up
              </Link>
            </div>

            <div className="mt-4 text-center text-sm">
              <Link to="/" className="text-gray-600 hover:underline">
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
