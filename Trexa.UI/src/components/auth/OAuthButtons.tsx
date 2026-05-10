import { apiUrl } from '../../config/api';
import { Button } from '../ui/button';

export function OAuthButtons() {
  const startOAuth = (provider: 'google') => {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    window.location.href = apiUrl(`/auth/external/${provider}?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={() => startOAuth('google')}>
        Continue with Google
      </Button>
    </div>
  );
}
