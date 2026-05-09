import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { CreditCard, IndianRupee } from 'lucide-react';
import { apiUrl } from '../../config/api';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface Payment {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  planId: string;
  planName?: string | null;
  orderId: string;
  paymentId?: string | null;
  amount: number;
  amountMajor: number;
  currency: string;
  status: string;
  gatewayStatus?: string | null;
  failureReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

interface PaymentSummary {
  count: number;
  paidCount: number;
  totalPaid: number;
}

interface PaymentHistoryProps {
  title: string;
  description: string;
  showCustomer?: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (amount: number, currency: string) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'created':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function PaymentHistory({ title, description, showCustomer = false }: PaymentHistoryProps) {
  const { accessToken } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentSearch, setPaymentSearch] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [accessToken]);

  const fetchPayments = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch(apiUrl('/payments'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load payments');
      }

      setPayments(data.payments || []);
      setSummary(data.summary || null);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const paidTotal = useMemo(() => {
    return summary?.totalPaid ?? payments
      .filter(payment => payment.status === 'paid')
      .reduce((total, payment) => total + payment.amountMajor, 0);
  }, [payments, summary]);

  const filteredPayments = useMemo(() => {
    const normalized = paymentSearch.trim().toLowerCase();
    if (!normalized) return payments;

    return payments.filter(payment =>
      [
        payment.userName,
        payment.userEmail,
        payment.userId,
        payment.planName,
        payment.planId,
        payment.orderId,
        payment.paymentId,
        payment.status,
        payment.gatewayStatus,
        payment.failureReason,
        payment.amountMajor,
        payment.currency,
        payment.createdAt,
        payment.verifiedAt,
      ]
        .filter(value => value !== null && value !== undefined)
        .some(value => String(value).toLowerCase().includes(normalized))
    );
  }, [payments, paymentSearch]);

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
            <CardTitle className="text-sm">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatMoney(paidTotal, 'INR')}</div>
            <p className="text-xs text-muted-foreground">Successful payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Paid Records</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{summary?.paidCount ?? payments.filter(payment => payment.status === 'paid').length}</div>
            <p className="text-xs text-muted-foreground">Verified transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">All Records</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{summary?.count ?? payments.length}</div>
            <p className="text-xs text-muted-foreground">Created and completed orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>Latest transactions first</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No payments found</div>
          ) : (
            <>
            <Input
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              placeholder="Search payments by customer, plan, status, order, or amount"
              className="mb-4 max-w-md"
            />
            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No payments match your search</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {showCustomer && <TableHead>Customer</TableHead>}
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(payment => (
                  <TableRow key={payment.id}>
                    {showCustomer && (
                      <TableCell>
                        <div>{payment.userName || 'Unknown User'}</div>
                        <div className="text-xs text-gray-500">{payment.userEmail || payment.userId}</div>
                      </TableCell>
                    )}
                    <TableCell>{payment.planName || payment.planId || 'N/A'}</TableCell>
                    <TableCell>{formatMoney(payment.amountMajor, payment.currency)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(payment.status)}>{payment.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>{payment.paymentId || payment.orderId}</div>
                      {payment.failureReason && (
                        <div className="text-xs text-red-600">{payment.failureReason}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payment.verifiedAt || payment.createdAt)}</TableCell>
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
