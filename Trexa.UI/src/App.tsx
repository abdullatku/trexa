import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './components/pages/LandingPage';
import { SignInPage } from './components/pages/SignInPage';
import { SignUpPage } from './components/pages/SignUpPage';
import { SignUpConfirmationPage } from './components/pages/SignUpConfirmationPage';
import { EmailVerificationPage } from './components/pages/EmailVerificationPage';
import { StudentDashboard } from './components/pages/StudentDashboard';
import { InterviewerDashboard } from './components/pages/InterviewerDashboard';
import { AdminDashboard } from './components/pages/AdminDashboard';
import { DebugPlans } from './components/debug/DebugPlans';
import { ServerHealth } from './components/debug/ServerHealth';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signup/confirmation" element={<SignUpConfirmationPage />} />
          <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
          
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/interviewer/*"
            element={
              <ProtectedRoute allowedRoles={['interviewer']}>
                <InterviewerDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route path="/debug/plans" element={<DebugPlans />} />
          <Route path="/debug/server-health" element={<ServerHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}
