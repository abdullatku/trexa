import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AdminUsers } from '../admin/AdminUsers';
import { AdminInterviews } from '../admin/AdminInterviews';
import { AdminDesignations } from '../admin/AdminDesignations';
import { AdminFeedbackForms } from '../admin/AdminFeedbackForms';
import { AdminPlans } from '../admin/AdminPlans';
import { AdminPayments } from '../admin/AdminPayments';
import { AdminAnalytics } from '../admin/AdminAnalytics';
import { AdminCalCom } from '../admin/AdminCalCom';
import { DashboardLayout } from '../layout/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { apiUrl } from '../../config/api';
import { Button } from '../ui/button';
import { Users, Calendar, Briefcase, FileText, CreditCard, BarChart3, Video, BellRing } from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [hasPendingInterviewRequests, setHasPendingInterviewRequests] = useState(false);
  const [showNewInterviewNotification, setShowNewInterviewNotification] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    let initialized = false;
    let knownPendingIds = new Set<string>();

    const fetchInterviewHighlight = async () => {
      try {
        const response = await fetch(apiUrl('/interviews'), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          const pending = (data.interviews || []).filter((interview: any) => interview.status === 'pending');
          const pendingIds = new Set<string>(pending.map((interview: any) => interview.id).filter(Boolean));
          setHasPendingInterviewRequests(pending.length > 0);

          if (initialized) {
            const hasNewPending = [...pendingIds].some((id) => !knownPendingIds.has(id));
            if (hasNewPending) {
              setShowNewInterviewNotification(true);
            }
          } else {
            initialized = true;
          }

          knownPendingIds = pendingIds;
        }
      } catch {
        setHasPendingInterviewRequests(false);
      }
    };

    fetchInterviewHighlight();
    const intervalId = window.setInterval(fetchInterviewHighlight, 30000);
    return () => window.clearInterval(intervalId);
  }, [accessToken]);

  const menuItems = [
    {
      label: 'Analytics',
      icon: BarChart3,
      path: '/admin',
      exact: true,
      onClick: () => navigate('/admin'),
    },
    {
      label: 'Users',
      icon: Users,
      path: '/admin/users',
      onClick: () => navigate('/admin/users'),
    },
    {
      label: 'Interviews',
      icon: Calendar,
      path: '/admin/interviews',
      highlight: hasPendingInterviewRequests,
      onClick: () => navigate('/admin/interviews'),
    },
    {
      label: 'Designations',
      icon: Briefcase,
      path: '/admin/designations',
      onClick: () => navigate('/admin/designations'),
    },
    {
      label: 'Feedback Forms',
      icon: FileText,
      path: '/admin/feedback-forms',
      onClick: () => navigate('/admin/feedback-forms'),
    },
    {
      label: 'Plans',
      icon: CreditCard,
      path: '/admin/plans',
      onClick: () => navigate('/admin/plans'),
    },
    {
      label: 'Payments',
      icon: CreditCard,
      path: '/admin/payments',
      onClick: () => navigate('/admin/payments'),
    },
    {
      label: 'Cal.com',
      icon: Video,
      path: '/admin/cal-com',
      onClick: () => navigate('/admin/cal-com'),
    },
  ];

  return (
    <DashboardLayout
      title="Admin Dashboard"
      menuItems={menuItems}
      notification={showNewInterviewNotification ? (
        <div className="rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-orange-950 shadow-sm ring-1 ring-orange-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white ring-4 ring-orange-100">
                <BellRing className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">New interview request</div>
                <div className="text-sm text-orange-800">A candidate request is pending assignment.</div>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => {
                setShowNewInterviewNotification(false);
                navigate('/admin/interviews');
              }}
            >
              Review Requests
            </Button>
          </div>
        </div>
      ) : undefined}
    >
      <Routes>
        <Route index element={<AdminAnalytics />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="interviews" element={<AdminInterviews />} />
        <Route path="designations" element={<AdminDesignations />} />
        <Route path="feedback-forms" element={<AdminFeedbackForms />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="cal-com" element={<AdminCalCom />} />
      </Routes>
    </DashboardLayout>
  );
}
