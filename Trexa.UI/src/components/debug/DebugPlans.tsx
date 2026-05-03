import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { apiBaseUrl } from "../../config/api";
import { RefreshCw } from 'lucide-react';

export function DebugPlans() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const checkPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/plans`
      );
      const result = await response.json();
      setData({ endpoint: '/plans', ...result });
      console.log('Plans check result:', result);
    } catch (error) {
      console.error('Error checking plans:', error);
      setData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const initPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/debug/init-plans`
      );
      const result = await response.json();
      setData({ endpoint: '/debug/init-plans', ...result });
      console.log('Init plans result:', result);
    } catch (error) {
      console.error('Error initializing plans:', error);
      setData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Plans Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={checkPlans} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Plans
            </Button>
            <Button onClick={initPlans} disabled={loading} variant="outline">
              Initialize Default Plans
            </Button>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          )}

          {data && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
