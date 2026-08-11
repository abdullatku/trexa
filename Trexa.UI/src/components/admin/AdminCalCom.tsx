import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '../../config/api';
import { useAuth } from '../auth/AuthContext';

interface CalComConfig {
  apiBaseUrl: string;
  appBaseUrl: string;
  apiVersion: string;
  oauthClientConfigured: boolean;
  oauthRedirectUrl: string;
  webhookUrl: string;
  oauthScopes: string;
  timezone: string;
  defaultDurationMinutes: number;
  useDefaultDurationMinutes: boolean;
  addInterviewerAsGuest: boolean;
  allowConflicts: boolean;
  allowBookingOutOfBounds: boolean;
}

const emptyConfig: CalComConfig = {
  apiBaseUrl: '',
  appBaseUrl: '',
  apiVersion: '',
  oauthClientConfigured: false,
  oauthRedirectUrl: '',
  webhookUrl: '',
  oauthScopes: '',
  timezone: '',
  defaultDurationMinutes: 60,
  useDefaultDurationMinutes: false,
  addInterviewerAsGuest: false,
  allowConflicts: false,
  allowBookingOutOfBounds: false,
};

export function AdminCalCom() {
  const { accessToken } = useAuth();
  const [config, setConfig] = useState<CalComConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, [accessToken]);

  const fetchConfig = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/admin/cal-com'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Cal.com settings');
      }
      setConfig({ ...emptyConfig, ...data.configuration });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Cal.com settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading Cal.com settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Cal.com</h1>
        <p className="text-muted-foreground mt-2">
          OAuth configuration is shared by Trexa; each interviewer connects their own Cal.com account and event type.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Status label="API URL" ok={Boolean(config.apiBaseUrl)} value={config.apiBaseUrl || 'Missing'} />
        <Status label="API Version" ok={config.apiVersion === '2026-02-25'} value={config.apiVersion || 'Missing'} />
        <Status label="OAuth Client" ok={config.oauthClientConfigured} value={config.oauthClientConfigured ? 'Configured' : 'Missing'} />
        <Status label="OAuth Callback" ok={Boolean(config.oauthRedirectUrl)} value={config.oauthRedirectUrl || 'Missing'} />
        <Status label="Webhook URL" ok={Boolean(config.webhookUrl)} value={config.webhookUrl || 'Missing'} />
        <Status label="OAuth Scopes" ok={Boolean(config.oauthScopes)} value={config.oauthScopes || 'Missing'} />
        <Status label="Timezone" ok={Boolean(config.timezone)} value={config.timezone || 'Missing'} />
        <Status label="Duration Override" ok value={config.useDefaultDurationMinutes ? `${config.defaultDurationMinutes || 0} minutes` : 'Using Cal.com event type duration'} />
        <Status label="Interviewer Guest" ok value={config.addInterviewerAsGuest ? 'Added as booking guest' : 'Not added as guest'} />
      </div>
    </div>
  );
}

function Status({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex min-h-16 items-start gap-3 rounded-md border bg-white p-4">
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-600" />}
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 break-all text-sm text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}
