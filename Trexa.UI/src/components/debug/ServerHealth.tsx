import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { apiBaseUrl, apiUrl } from '../../config/api';

interface HealthStatus {
  status: 'checking' | 'healthy' | 'unhealthy' | 'error';
  message: string;
  timestamp?: string;
  details?: any;
}

export function ServerHealth() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'checking',
    message: 'Checking server health...',
  });
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    setHealthStatus({ status: 'checking', message: 'Checking server health...' });

    try {
      const response = await fetch(apiUrl('/health'), {
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        setHealthStatus({
          status: 'healthy',
          message: 'Server is running and healthy',
          timestamp: data.timestamp,
          details: data,
        });
      } else {
        setHealthStatus({
          status: 'unhealthy',
          message: `Server returned status ${response.status}`,
          details: await response.text().catch(() => 'No response body'),
        });
      }
    } catch (error: any) {
      let message = 'Unable to connect to server';
      if (error.name === 'TimeoutError') {
        message = 'Server timeout - request took too long';
      } else if (error.message) {
        message = error.message;
      }

      setHealthStatus({
        status: 'error',
        message,
        details: error.toString(),
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'checking':
        return <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />;
      case 'healthy':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (healthStatus.status) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'healthy':
        return <Badge className="bg-green-600">Healthy</Badge>;
      case 'unhealthy':
        return <Badge className="bg-yellow-600">Unhealthy</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl mb-2">Server Diagnostics</h1>
          <p className="text-gray-600">Check the health and connectivity of the backend server</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <CardTitle>Server Status</CardTitle>
                  <CardDescription className="mt-1">{healthStatus.message}</CardDescription>
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthStatus.timestamp && (
              <div>
                <p className="text-sm font-medium text-gray-700">Server Timestamp</p>
                <p className="text-sm text-gray-600">{new Date(healthStatus.timestamp).toLocaleString()}</p>
              </div>
            )}

            {healthStatus.details && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Details</p>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
                  {typeof healthStatus.details === 'string'
                    ? healthStatus.details
                    : JSON.stringify(healthStatus.details, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Configuration</p>
              <div className="text-sm bg-gray-100 p-4 rounded space-y-1">
                <p><span className="font-medium">Server URL:</span> {apiBaseUrl}</p>
              </div>
            </div>

            <Button onClick={checkHealth} disabled={checking} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Recheck Server Health'}
            </Button>

            {healthStatus.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Troubleshooting Tips:</h4>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Check your internet connection</li>
                  <li>Verify the .NET API is running</li>
                  <li>Verify `VITE_API_BASE_URL` points to your API prefix</li>
                  <li>Check the browser console for detailed error messages</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
