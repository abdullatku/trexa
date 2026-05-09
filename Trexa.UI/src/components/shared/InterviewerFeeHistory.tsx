import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { IndianRupee } from 'lucide-react';
import { apiUrl } from '../../config/api';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface InterviewerFeePayment {
  id: string;
  interviewId: string;
  studentName?: string | null;
  studentEmail?: string | null;
  interviewerName?: string | null;
  interviewerEmail?: string | null;
  amount: number;
  currency: string;
  status: string;
  released: boolean;
  releasedAt?: string | null;
  scheduledDate: string;
  createdAt: string;
}

interface InterviewerFeeSummary {
  count: number;
  totalAssigned: number;
  totalCompleted: number;
  totalReleased: number;
}

interface InterviewerFeeHistoryProps {
  title: string;
  description: string;
  showInterviewer?: boolean;
  canRelease?: boolean;
}

const formatMoney = (amount: number, currency: string) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value: string) => {
  if (!value || value === 'pending') return 'Pending';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Pending' : date.toLocaleString();
};

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function InterviewerFeeHistory({ title, description, showInterviewer = false, canRelease = false }: InterviewerFeeHistoryProps) {
  const { accessToken } = useAuth();
  const [payments, setPayments] = useState<InterviewerFeePayment[]>([]);
  const [summary, setSummary] = useState<InterviewerFeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [feeSearch, setFeeSearch] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [accessToken]);

  const fetchPayments = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch(apiUrl('/interviewer-payments'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load interviewer payments');
      }

      setPayments(data.payments || []);
      setSummary(data.summary || null);
    } catch (error: any) {
      console.error('Error fetching interviewer payments:', error);
      toast.error(error.message || 'Failed to load interviewer payments');
    } finally {
      setLoading(false);
    }
  };

  const releasePayment = async (payment: InterviewerFeePayment) => {
    if (!accessToken || payment.released) return;

    setReleasingId(payment.interviewId);
    try {
      const response = await fetch(apiUrl(`/admin/interviewer-payments/${payment.interviewId}/release`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to release interviewer payment');
      }

      toast.success(data.message || 'Interviewer payment released');
      fetchPayments();
    } catch (error: any) {
      console.error('Error releasing interviewer payment:', error);
      toast.error(error.message || 'Failed to release interviewer payment');
    } finally {
      setReleasingId(null);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const normalized = feeSearch.trim().toLowerCase();
    if (!normalized) return true;

    return [
      payment.interviewerName,
      payment.interviewerEmail,
      payment.studentName,
      payment.studentEmail,
      payment.interviewId,
      payment.amount,
      payment.currency,
      payment.status,
      payment.released ? 'released' : 'pending',
      payment.releasedAt,
      payment.scheduledDate,
      payment.createdAt,
    ]
      .filter(value => value !== null && value !== undefined)
      .some(value => String(value).toLowerCase().includes(normalized));
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Released Fees</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatMoney(summary?.totalReleased || 0, 'INR')}</div>
            <p className="text-xs text-muted-foreground">Released by admin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{canRelease ? 'Pending Release' : 'Records'}</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {canRelease
                ? formatMoney((summary?.totalAssigned || 0) - (summary?.totalReleased || 0), 'INR')
                : summary?.count || payments.length}
            </div>
            <p className="text-xs text-muted-foreground">{canRelease ? 'Not yet released' : 'Released payments'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Completed Fees</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatMoney(summary?.totalCompleted || 0, 'INR')}</div>
            <p className="text-xs text-muted-foreground">Completed interviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Fees</CardTitle>
          <CardDescription>{canRelease ? 'Release payments after reviewing interview fees' : 'Only payments released by admin are shown'}</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No interviewer payments found</div>
          ) : (
            <>
            <Input
              value={feeSearch}
              onChange={(e) => setFeeSearch(e.target.value)}
              placeholder="Search interviewer payments by person, status, release, fee, or date"
              className="mb-4 max-w-md"
            />
            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No interviewer payments match your search</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {showInterviewer && <TableHead>Interviewer</TableHead>}
                  <TableHead>Student</TableHead>
                  <TableHead>Interview</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Scheduled</TableHead>
                  {canRelease && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(payment => (
                  <TableRow key={payment.id}>
                    {showInterviewer && (
                      <TableCell>
                        <div>{payment.interviewerName || 'Unknown Interviewer'}</div>
                        <div className="text-xs text-gray-500">{payment.interviewerEmail || '-'}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div>{payment.studentName || 'Unknown Student'}</div>
                      <div className="text-xs text-gray-500">{payment.studentEmail || '-'}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{payment.interviewId}</TableCell>
                    <TableCell>{formatMoney(payment.amount, payment.currency)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(payment.status)}>{payment.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {payment.released ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800">Released</Badge>
                          {payment.releasedAt && (
                            <div className="text-xs text-gray-500 mt-1">{formatDate(payment.releasedAt)}</div>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payment.scheduledDate || payment.createdAt)}</TableCell>
                    {canRelease && (
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => releasePayment(payment)}
                          disabled={payment.released || payment.status === 'cancelled' || releasingId === payment.interviewId}
                        >
                          {payment.released ? 'Released' : releasingId === payment.interviewId ? 'Releasing...' : 'Release'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
