import { Routes, Route, useNavigate } from 'react-router-dom';
import { InterviewerInterviewsList } from '../interviewer/InterviewerInterviewsList';
import { InterviewerAvailability } from '../interviewer/InterviewerAvailability';
import { ProfilePage } from '../shared/ProfilePage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { Calendar, Clock, User } from 'lucide-react';

export function InterviewerDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'My Interviews',
      icon: Calendar,
      onClick: () => navigate('/interviewer'),
    },
    {
      label: 'Availability',
      icon: Clock,
      onClick: () => navigate('/interviewer/availability'),
    },
    {
      label: 'Profile',
      icon: User,
      onClick: () => navigate('/interviewer/profile'),
    },
  ];

  return (
    <DashboardLayout title="Interviewer Dashboard" menuItems={menuItems}>
      <Routes>
        <Route index element={<InterviewerInterviewsList />} />
        <Route path="availability" element={<InterviewerAvailability />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </DashboardLayout>
  );
}