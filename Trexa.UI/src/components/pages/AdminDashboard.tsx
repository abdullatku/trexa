import { Routes, Route, useNavigate } from 'react-router-dom';
import { AdminUsers } from '../admin/AdminUsers';
import { AdminInterviews } from '../admin/AdminInterviews';
import { AdminDesignations } from '../admin/AdminDesignations';
import { AdminFeedbackForms } from '../admin/AdminFeedbackForms';
import { AdminPlans } from '../admin/AdminPlans';
import { AdminAnalytics } from '../admin/AdminAnalytics';
import { DashboardLayout } from '../layout/DashboardLayout';
import { Users, Calendar, Briefcase, FileText, CreditCard, BarChart3 } from 'lucide-react';

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
      </Routes>
    </DashboardLayout>
  );
}
