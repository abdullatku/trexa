import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { GraduationCap, Users, Calendar, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Redirect to appropriate dashboard if already logged in
      if (user.role === 'student') {
        navigate('/student');
      } else if (user.role === 'interviewer') {
        navigate('/interviewer');
      } else if (user.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl">MockInterview Pro</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/signin')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/signup')}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl mb-6">
            Master Your Interview Skills
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Practice with experienced interviewers across different software technologies. Get personalized feedback and improve your chances of landing your dream job.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/signin')}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <Calendar className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-2xl mb-3">Flexible Scheduling</h3>
            <p className="text-gray-600">
              Schedule mock interviews at your convenience for various designations and technologies.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <Users className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-2xl mb-3">Expert Interviewers</h3>
            <p className="text-gray-600">
              Practice with experienced professionals who understand the industry standards.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <CheckCircle className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-2xl mb-3">Detailed Feedback</h3>
            <p className="text-gray-600">
              Receive comprehensive feedback to identify areas of improvement and build confidence.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 bg-white p-10 rounded-lg shadow-md">
          <h2 className="text-3xl text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h4 className="mb-2">Sign Up</h4>
              <p className="text-sm text-gray-600">Create your account and choose a plan</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h4 className="mb-2">Select Role</h4>
              <p className="text-sm text-gray-600">Choose the designation you want to practice for</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h4 className="mb-2">Schedule Interview</h4>
              <p className="text-sm text-gray-600">Pick a date and time that works for you</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                4
              </div>
              <h4 className="mb-2">Get Feedback</h4>
              <p className="text-sm text-gray-600">Receive detailed feedback to improve</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-20 py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>&copy; 2025 MockInterview Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
