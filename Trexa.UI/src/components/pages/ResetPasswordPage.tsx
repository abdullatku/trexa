import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token') ?? '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      toast.success('Password reset successfully. You can now sign in.');
      navigate('/signin');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600">Trexa</p>
          <h1 className="text-3xl font-semibold mt-4">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-600">Enter a new password for your account.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Password</CardTitle>
            <CardDescription>Choose a secure password and submit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <Button variant="ghost" type="button" className="text-indigo-600 hover:underline" onClick={() => navigate('/signin')}>
                Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
