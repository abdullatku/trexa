import { Routes, Route, useNavigate } from 'react-router-dom';
import { StudentInterviewsList } from '../student/StudentInterviewsList';
import { ViewPlans } from '../student/ViewPlans';
import { SelectPlan } from '../student/SelectPlan';
import { ProfilePage } from '../shared/ProfilePage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { Calendar, CreditCard, User } from 'lucide-react';

export function StudentDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'My Interviews',
      icon: Calendar,
      onClick: () => navigate('/student'),
    },
    {
      label: 'Plans & Pricing',
      icon: CreditCard,
      onClick: () => navigate('/student/plans'),
    },
    {
      label: 'Profile',
      icon: User,
      onClick: () => navigate('/student/profile'),
    },
  ];

  return (
    <DashboardLayout title="Student Dashboard" menuItems={menuItems}>
      <Routes>
        <Route index element={<StudentInterviewsList />} />
        <Route path="plans" element={<ViewPlans />} />
        <Route path="select-plan" element={<SelectPlan />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </DashboardLayout>
  );
}