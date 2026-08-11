import { useEffect, useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../auth/AuthContext';
import { apiUrl } from '../../config/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type IntegrationStatus = {
  connected: boolean;
  connectedAt?: string;
  eventTypeId?: number;
  webhookConfigured: boolean;
};

export function CalComIntegration() {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [eventTypeId, setEventTypeId] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const response = await fetch(apiUrl('/integrations/calcom/status'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    setStatus(data);
    setEventTypeId(data.eventTypeId?.toString() || '');
  };

  useEffect(() => {
    if (accessToken) loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('calcom') === 'connected') toast.success('Cal.com connected successfully');
    if (params.get('calcom') === 'error') toast.error(params.get('message') || 'Could not connect Cal.com');
    if (params.get('calcom') === 'event-type-required') {
      toast.info('Choose the Cal.com event type Trexa should use for your meetings');
    }
  }, [accessToken]);

  const connect = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/integrations/calcom/connect'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start Cal.com connection');
      window.location.assign(data.authorizationUrl);
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/integrations/calcom/settings'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventTypeId: Number(eventTypeId) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save event type');
      toast.success('Cal.com event type saved');
      await loadStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/integrations/calcom'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Could not disconnect Cal.com');
      toast.success('Cal.com disconnected');
      await loadStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Cal.com</CardTitle>
            <CardDescription>Connect your own scheduling account to host Trexa interviews.</CardDescription>
          </div>
          <Badge variant={status?.connected ? 'default' : 'secondary'}>
            {status?.connected ? 'Connected' : 'Not connected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.connected ? (
          <Button onClick={connect} disabled={loading}>
            <ExternalLink className="mr-2 h-4 w-4" /> Connect or create Cal.com account
          </Button>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="cal-event-type">Cal.com event type ID</Label>
              <div className="flex max-w-md gap-2">
                <Input id="cal-event-type" type="number" min="1" value={eventTypeId}
                  onChange={(event) => setEventTypeId(event.target.value)} placeholder="e.g. 123456" />
                <Button onClick={save} disabled={loading || !eventTypeId}>Save</Button>
              </div>
              <p className="text-sm text-gray-500">
                Open an event type in Cal.com and copy its numeric ID. Configure Cal Video as its location.
              </p>
            </div>
            <Button variant="outline" onClick={disconnect} disabled={loading}>Disconnect</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
