# MockInterview Pro

A comprehensive web application for hosting mock interviews for students across different software technologies. Built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

### User Roles

#### Students
- Sign up and sign in with email/password
- View scheduled and past interviews
- Schedule new interviews for different designations
- Request new designations if not available
- View and subscribe to plans
- Receive detailed feedback from interviewers

#### Interviewers
- Sign in to the system (created by admin)
- View assigned interviews
- Provide structured feedback through customizable forms
- Track completed interviews

#### Admins
- Create users (students, interviewers, other admins)
- Manage all interviews and assign interviewers
- Create and manage designations
- Design custom feedback forms
- Create subscription plans
- View all system data

### Key Functionality

- **Authentication**: Secure email/password authentication via Supabase Auth
- **Role-Based Access Control**: Different interfaces and permissions for each user role
- **Interview Scheduling**: Students can schedule interviews with date/time selection
- **Designation Management**: Flexible designation system with request functionality
- **Custom Feedback Forms**: Admins can create dynamic feedback forms
- **Plan Management**: Multiple subscription tiers with different features
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui component library
- **Backend**: Supabase Edge Functions (Deno + Hono)
- **Database**: Supabase KV Store
- **Authentication**: Supabase Auth

## Project Structure

```
/
├── App.tsx                          # Main application component with routing
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx         # Authentication context and hooks
│   │   └── ProtectedRoute.tsx      # Route protection component
│   ├── layout/
│   │   └── DashboardLayout.tsx     # Shared dashboard layout
│   ├── pages/
│   │   ├── LandingPage.tsx         # Public landing page
│   │   ├── SignInPage.tsx          # Sign in page
│   │   ├── SignUpPage.tsx          # Sign up page
│   │   ├── StudentDashboard.tsx    # Student dashboard with routing
│   │   ├── InterviewerDashboard.tsx # Interviewer dashboard
│   │   └── AdminDashboard.tsx      # Admin dashboard with routing
│   ├── student/
│   │   ├── StudentInterviewsList.tsx # View interviews
│   │   ├── ScheduleInterview.tsx   # Schedule new interview
│   │   └── ViewPlans.tsx           # View subscription plans
│   ├── interviewer/
│   │   └── InterviewerInterviewsList.tsx # View and provide feedback
│   ├── admin/
│   │   ├── AdminUsers.tsx          # User management
│   │   ├── AdminInterviews.tsx     # Interview management
│   │   ├── AdminDesignations.tsx   # Designation management
│   │   ├── AdminFeedbackForms.tsx  # Feedback form builder
│   │   └── AdminPlans.tsx          # Plan management
│   └── ui/                         # Reusable UI components
├── supabase/functions/server/
│   ├── index.tsx                   # Main server with all API endpoints
│   └── kv_store.tsx                # KV store utilities (protected)
└── utils/
    ├── supabase/
    │   └── info.tsx                # Supabase configuration
    └── init-data.md                # Database initialization guide

```

## API Endpoints

### Authentication
- `POST /auth/signup` - Student signup
- `POST /admin/create-user` - Admin creates any user type
- `GET /auth/profile` - Get current user profile

### Designations
- `GET /designations` - Get all designations
- `POST /designations/request` - Request new designation
- `POST /admin/designations` - Create designation (admin)

### Interviews
- `POST /interviews` - Schedule interview
- `GET /interviews` - Get user's interviews
- `PUT /admin/interviews/:id/assign` - Assign interviewer (admin)
- `POST /interviews/:id/feedback` - Submit feedback (interviewer)

### Feedback Forms
- `GET /feedback-forms` - Get all forms
- `POST /admin/feedback-forms` - Create form (admin)

### Plans
- `GET /plans` - Get all plans (public)
- `POST /admin/plans` - Create plan (admin)

### Admin
- `GET /admin/users` - Get all users (admin)

## Getting Started

### Prerequisites

1. Supabase account and project
2. Environment variables configured in Supabase

### Initial Setup

1. **Create Initial Admin User**
   - See `/utils/init-data.md` for detailed instructions
   - Manually create the first admin user through Supabase dashboard

2. **Create Sample Data** (via Admin Dashboard)
   - Designations (e.g., Frontend Developer, Backend Developer)
   - Feedback forms
   - Subscription plans
   - Interviewer accounts

### User Flows

#### Student Journey
1. Sign up on the landing page
2. Sign in to access student dashboard
3. View available plans and subscribe (payment not implemented)
4. Schedule an interview by selecting:
   - Designation
   - Date and time
   - Optional notes
5. View upcoming and past interviews
6. Review feedback from completed interviews

#### Interviewer Journey
1. Admin creates interviewer account
2. Interviewer signs in
3. View assigned interviews
4. After interview, provide feedback using custom form
5. Submit feedback to complete interview

#### Admin Journey
1. Sign in with admin credentials
2. Create users (students, interviewers, admins)
3. Create designations for different roles
4. Design feedback forms with custom fields
5. Create subscription plans
6. Assign interviewers to scheduled interviews
7. Monitor all system activity

## Notes

- **Email Confirmation**: Auto-enabled since email server isn't configured
- **Payment Integration**: Placeholder only - needs Stripe/PayPal integration
- **Data Privacy**: This is a prototype - not suitable for production PII storage
- **Next.js Migration**: Code structure supports easy migration to Next.js
- **Database**: Uses Supabase KV store for flexibility and ease of prototyping

## Security Considerations

- All API routes (except public ones) require authentication
- Role-based access control enforced on backend
- SUPABASE_SERVICE_ROLE_KEY is never exposed to frontend
- Access tokens used for all authenticated requests
- Protected routes redirect unauthorized users

## Future Enhancements

- Video interview integration
- Payment gateway integration (Stripe/PayPal)
- Email notifications for interview reminders
- Interview recording and playback
- Advanced analytics and reporting
- Student performance tracking
- Interviewer rating system
- Calendar integration (Google Calendar, Outlook)
- Real-time chat support
- Export feedback as PDF

## Development

The application uses Vite for fast development and hot module replacement. All backend code runs on Supabase Edge Functions using Deno runtime.

### Architecture

The application follows a three-tier architecture:
```
Frontend (React) → Server (Hono/Deno) → Database (KV Store)
```

All data flows through the backend API, ensuring security and data validation.

---

Built with ❤️ for aspiring software engineers
