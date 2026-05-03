# Quick Setup Guide

Follow these steps to get your MockInterview Pro application up and running.

## Step 1: Create Your First Admin User

Since the application needs an admin to create other users, you'll need to manually create the first admin user.

### Option A: Temporary Signup as Admin (Recommended for Quick Start)

1. Temporarily modify `/supabase/functions/server/index.tsx` line 66:
   ```typescript
   // Change this line:
   role: 'student',
   
   // To:
   role: 'admin',
   ```

2. Go to the signup page and create your admin account
3. After creating the account, **change the code back** to `role: 'student'`
4. Now sign in with your admin credentials

### Option B: Create via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** (or **Invite user**)
4. Fill in:
   - Email: `admin@yourdomain.com`
   - Password: (choose a secure password)
   - Auto Confirm User: **Yes**
   
5. Copy the User ID (UUID) from the newly created user

6. Now you need to create the user profile in the KV store. You can do this by:
   - Using the Supabase SQL editor or
   - Making an API call with the service role key

7. Alternatively, you can use the "Admin Create User" endpoint by temporarily bypassing the admin check, or create a one-time setup script.

## Step 2: Sign In as Admin

1. Go to the application landing page
2. Click **Sign In**
3. Enter your admin credentials
4. You'll be redirected to the Admin Dashboard

## Step 3: Set Up Initial Data

Now that you're logged in as admin, set up your system:

### 3.1 Create Designations

1. Go to **Admin Dashboard** → **Designations**
2. Click **Create Designation**
3. Add designations like:
   - **Frontend Developer** - React, Vue, Angular interviews
   - **Backend Developer** - Node.js, Python, Java interviews
   - **Full Stack Developer** - Complete web development
   - **DevOps Engineer** - CI/CD, cloud platforms
   - **Mobile Developer** - iOS, Android, React Native
   - **Data Engineer** - Data pipelines, analytics

### 3.2 Create Feedback Forms

1. Go to **Admin Dashboard** → **Feedback Forms**
2. Click **Create Form**
3. Example form: "Technical Interview Feedback"
   - Field: `technicalSkills` (Textarea) - "Technical Knowledge & Skills"
   - Field: `communication` (Textarea) - "Communication Skills"
   - Field: `problemSolving` (Textarea) - "Problem Solving Ability"
   - Field: `codeQuality` (Textarea) - "Code Quality & Best Practices"
   - Field: `rating` (Number) - "Overall Rating (1-10)"
   - Field: `strengths` (Textarea) - "Key Strengths"
   - Field: `improvements` (Textarea) - "Areas for Improvement"
   - Field: `recommendation` (Text) - "Would you recommend hiring? (Yes/No/Maybe)"

### 3.3 Create Plans

1. Go to **Admin Dashboard** → **Plans**
2. Create multiple plans:

   **Basic Plan**
   - Name: Basic
   - Price: $29
   - Interviews: 5
   - Duration: monthly
   - Features:
     - 5 mock interviews per month
     - Basic feedback reports
     - Email support

   **Pro Plan**
   - Name: Pro
   - Price: $49
   - Interviews: 10
   - Duration: monthly
   - Features:
     - 10 mock interviews per month
     - Detailed feedback reports
     - Priority scheduling
     - Email & chat support

   **Premium Plan**
   - Name: Premium
   - Price: $99
   - Interviews: 20
   - Duration: monthly
   - Features:
     - 20 mock interviews per month
     - Comprehensive feedback with recommendations
     - Priority scheduling
     - Dedicated support
     - Resume review

### 3.4 Create Interviewers

1. Go to **Admin Dashboard** → **Users**
2. Click **Create User**
3. Create interviewer accounts:
   - Name: John Smith
   - Email: `john.smith@interviewers.com`
   - Password: (set a password)
   - Role: **Interviewer**
   
4. Repeat for multiple interviewers
5. Share credentials with your interviewing team

### 3.5 (Optional) Create Test Student

Create a test student account to see the student experience:
- Name: Test Student
- Email: `student@test.com`
- Password: (set a password)
- Role: **Student**

## Step 4: Test the Complete Flow

### As Student:
1. Sign out from admin
2. Sign in as the test student (or sign up a new student)
3. Schedule an interview
4. View it in "My Interviews"

### As Admin:
1. Sign back in as admin
2. Go to **Interviews**
3. Assign an interviewer to the student's interview

### As Interviewer:
1. Sign in as an interviewer
2. View assigned interviews
3. Click "Provide Feedback"
4. Fill out the feedback form
5. Submit

### Back as Student:
1. Sign in as student again
2. Check "Past Interviews" tab
3. View the feedback received

## Step 5: Production Deployment

When moving to production:

1. **Enable Email Verification**
   - Set up SMTP in Supabase
   - Remove `email_confirm: true` from signup endpoints

2. **Payment Integration**
   - Integrate Stripe or PayPal in `ViewPlans.tsx`
   - Create webhook handlers for payment confirmation

3. **Security Hardening**
   - Review all API endpoints
   - Add rate limiting
   - Enable RLS policies if migrating from KV store

4. **Monitoring**
   - Set up error logging
   - Add analytics
   - Monitor API usage

## Common Issues

### Can't create admin user
- Use Option A from Step 1 (temporarily modify signup role)
- Or manually insert into KV store via Supabase dashboard

### "Unauthorized" errors
- Check that you're signed in
- Verify the access token is being sent
- Check user role in the database

### Interviews not showing
- Make sure interviewer is assigned (admin must assign)
- Check that the scheduledDate is valid
- Verify the interview was created successfully

### Feedback form not appearing
- Create at least one feedback form as admin
- The interviewer component will use the first available form

## Next Steps

- Customize the styling and branding
- Add your company logo
- Modify the landing page content
- Set up custom email templates
- Configure your domain

## Support

For issues or questions:
- Check the main README.md for architecture details
- Review the API endpoints documentation
- Check browser console for error messages
- Verify Supabase configuration

---

Happy interviewing! 🎯
