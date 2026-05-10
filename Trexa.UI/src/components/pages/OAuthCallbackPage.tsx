import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';

const getDashboardPath = (role: string) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'interviewer':
      return '/interviewer';
    default:
      return '/student';
  }
};

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { completeExternalSignIn } = useAuth();

  useEffect(() => {
    const complete = async () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const error = params.get('error');
      if (error) {
        toast.error(error);
        navigate('/signin', { replace: true });
        return;
      }

      const token = params.get('accessToken');
      if (!token) {
        toast.error('External sign-in did not return an access token');
        navigate('/signin', { replace: true });
        return;
      }

      try {
        const profile = await completeExternalSignIn(token);
        toast.success('Signed in successfully');
        navigate(getDashboardPath(profile.role), { replace: true });
      } catch (err: any) {
        toast.error(err.message || 'External sign-in failed');
        navigate('/signin', { replace: true });
      }
    };

    complete();
  }, [completeExternalSignIn, navigate]);

  return (
    <div className="auth-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="text-center text-gray-600">Completing sign in...</div>
    </div>
  );
}
