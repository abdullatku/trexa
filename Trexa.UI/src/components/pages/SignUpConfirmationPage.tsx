import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TrexaLogo } from '../ui/logo';

export function SignUpConfirmationPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="auth-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrexaLogo className="h-10 text-indigo-600" />
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              <MailCheck className="h-7 w-7 text-indigo-600" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              Your account has been created and needs email verification before you sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {email ? (
                <>
                  We sent a verification link to <span className="font-medium text-gray-900">{email}</span>.
                </>
              ) : (
                'We sent a verification link to your email address.'
              )}
            </p>

            <Button asChild className="w-full">
              <Link to="/signin">Go to Login</Link>
            </Button>

            <div className="text-center text-sm">
              <Link to="/signup" className="text-gray-600 hover:underline">
                Back to sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
