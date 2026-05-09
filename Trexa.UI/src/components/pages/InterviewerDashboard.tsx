import { Routes, Route, useNavigate } from 'react-router-dom';
import { InterviewerInterviewsList } from '../interviewer/InterviewerInterviewsList';
import { InterviewerAvailability } from '../interviewer/InterviewerAvailability';
import { InterviewerPayments } from '../interviewer/InterviewerPayments';
import { ProfilePage } from '../shared/ProfilePage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { Calendar, Clock, CreditCard, User } from 'lucide-react';

export function InterviewerDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'My Interviews',
      icon: Calendar,
      path: '/interviewer',
      exact: true,
      onClick: () => navigate('/interviewer'),
    },
    {
      label: 'Availability',
      icon: Clock,
      path: '/interviewer/availability',
      onClick: () => navigate('/interviewer/availability'),
    },
    {
      label: 'Payments',
      icon: CreditCard,
      path: '/interviewer/payments',
      onClick: () => navigate('/interviewer/payments'),
    },
    {
      label: 'Profile',
      icon: User,
      path: '/interviewer/profile',
      onClick: () => navigate('/interviewer/profile'),
    },
  ];

  return (
    <DashboardLayout title="Interviewer Dashboard" menuItems={menuItems}>
      <Routes>
        <Route index element={<InterviewerInterviewsList />} />
        <Route path="availability" element={<InterviewerAvailability />} />
        <Route path="payments" element={<InterviewerPayments />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </DashboardLayout>
  );
}
