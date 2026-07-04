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
import { Users, Calendar, Briefcase, FileText, CreditCard, BarChart3, Video } from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();

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
    <DashboardLayout title="Admin Dashboard" menuItems={menuItems}>
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
