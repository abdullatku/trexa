import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { apiUrl } from '../../config/api';

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
    const getOAuthParams = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, '');
      const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash;
      const hashParams = new URLSearchParams(hashQuery);

      return { queryParams, hashParams, params: hashParams.toString() ? hashParams : queryParams };
    };

    const complete = async () => {
      const { queryParams, hashParams, params } = getOAuthParams();
      const token = params.get('accessToken') || params.get('access_token') || params.get('token');

      const directCode = queryParams.get('code') || hashParams.get('code');
      if (directCode && !token) {
        const callbackParams = new URLSearchParams();
        callbackParams.set('code', directCode);

        const state = queryParams.get('state') || hashParams.get('state');
        const providerError = queryParams.get('error') || hashParams.get('error');
        if (state) callbackParams.set('state', state);
        if (providerError) callbackParams.set('error', providerError);

        window.location.replace(apiUrl(`/auth/external/google/callback?${callbackParams.toString()}`));
        return;
      }

      const error = params.get('error');
      if (error) {
        toast.error(error);
        navigate('/signin', { replace: true });
        return;
      }

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
