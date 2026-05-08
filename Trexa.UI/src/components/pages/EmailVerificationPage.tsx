import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing');
      setVerifying(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok) {
          setVerified(true);
          toast.success('Email verified successfully!');
        } else {
          setError(data.error || 'Failed to verify email');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('An error occurred while verifying your email');
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="h-10 w-10 text-indigo-600" />
            <span className="text-3xl">Trexa</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              {verifying ? (
                <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
              ) : verified ? (
                <CheckCircle className="h-7 w-7 text-green-600" />
              ) : (
                <XCircle className="h-7 w-7 text-red-600" />
              )}
            </div>
            <CardTitle>
              {verifying ? 'Verifying Email...' : verified ? 'Email Verified!' : 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {verifying
                ? 'Please wait while we verify your email address.'
                : verified
                ? 'Your email has been successfully verified. You can now sign in to your account.'
                : 'We could not verify your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!verifying && (
              <div className="space-y-2">
                {verified ? (
                  <Button asChild className="w-full">
                    <Link to="/signin">Sign In Now</Link>
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/signup">Back to Sign Up</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/signin">Go to Sign In</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}