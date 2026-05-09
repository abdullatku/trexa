import { Routes, Route, useNavigate } from 'react-router-dom';
import { StudentInterviewsList } from '../student/StudentInterviewsList';
import { ViewPlans } from '../student/ViewPlans';
import { SelectPlan } from '../student/SelectPlan';
import { StudentPayments } from '../student/StudentPayments';
import { ProfilePage } from '../shared/ProfilePage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { Calendar, CreditCard, User } from 'lucide-react';

export function StudentDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'My Interviews',
      icon: Calendar,
      path: '/student',
      exact: true,
      onClick: () => navigate('/student'),
    },
    {
      label: 'Plans & Pricing',
      icon: CreditCard,
      path: '/student/plans',
      onClick: () => navigate('/student/plans'),
    },
    {
      label: 'My Payments',
      icon: CreditCard,
      path: '/student/payments',
      onClick: () => navigate('/student/payments'),
    },
    {
      label: 'Profile',
      icon: User,
      path: '/student/profile',
      onClick: () => navigate('/student/profile'),
    },
  ];

  return (
    <DashboardLayout title="Student Dashboard" menuItems={menuItems}>
      <Routes>
        <Route index element={<StudentInterviewsList />} />
        <Route path="plans" element={<ViewPlans />} />
        <Route path="select-plan" element={<SelectPlan />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </DashboardLayout>
  );
}
