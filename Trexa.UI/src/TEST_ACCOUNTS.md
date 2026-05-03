# Test Accounts Setup Guide

## Problem: "Invalid login credentials" Error

This error occurs when you try to sign in with credentials that don't exist in Supabase Auth.

## Solution: Create Test Accounts

### Option 1: Use the SignUp Page (Recommended for Students)

1. Go to your app's signup page: `http://your-app-url/signup`
2. Fill in the form:
   - Name: Test Student
   - Email: student@test.com
   - Password: password123
   - Confirm Password: password123
3. Click "Sign Up"
4. After successful signup, click "Sign In"
5. Use the same credentials to sign in

### Option 2: Create Admin User via API (For Initial Setup)

Since you need an admin to create other users, you'll need to create the first admin manually:

#### Step 1: Create Admin Account

Use this curl command or API client (like Postman/Insomnia):

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-2eb59763/auth/signup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "name": "Test Admin"
  }'
```

Replace:
- `YOUR_PROJECT_ID` with your actual Supabase project ID
- `YOUR_ANON_KEY` with your Supabase anon key

#### Step 2: Manually Update Role to Admin

Since the signup endpoint only creates students, you need to manually update the role:

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Table Editor
2. Find the `kv_store_2eb59763` table
3. Look for the key that starts with `user:` and contains the admin email
4. Edit the value JSON and change `"role": "student"` to `"role": "admin"`
5. Save changes

**Option B: Via Backend Script**

Create a temporary route in `/supabase/functions/server/index.tsx`:

```typescript
// TEMPORARY - Remove after creating admin
app.post("/make-server-2eb59763/temp/make-admin", async (c) => {
  try {
    const { email } = await c.req.json();
    
    // Get all users
    const users = await kv.getByPrefix('user:');
    const user = users.find((u: any) => u.email === email);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update role to admin
    user.role = 'admin';
    await kv.set(user.id, user);
    
    return c.json({ message: 'User role updated to admin', user });
  } catch (error) {
    console.log(`Make admin error: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

Then call it:
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-2eb59763/temp/make-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com"}'
```

**IMPORTANT:** Delete this temporary route after creating your admin!

### Option 3: Pre-Seeded Test Accounts

Here are recommended test accounts to create:

#### Admin Account
```
Email: admin@mockinterview.com
Password: Admin123!
Name: System Admin
Role: admin
```

#### Interviewer Accounts
```
Email: interviewer1@mockinterview.com
Password: Interview123!
Name: John Interviewer
Role: interviewer

Email: interviewer2@mockinterview.com
Password: Interview123!
Name: Sarah Interviewer
Role: interviewer
```

#### Student Accounts
```
Email: student1@mockinterview.com
Password: Student123!
Name: Alice Student
Role: student

Email: student2@mockinterview.com
Password: Student123!
Name: Bob Student
Role: student
```

## Creating Accounts Flow

### 1. Create First Admin (Using Option 2 above)
- Signup as student via `/signup`
- Manually change role to admin in database

### 2. Sign in as Admin
- Go to `/signin`
- Use admin credentials
- You'll be redirected to `/admin`

### 3. Create Other Users
- As admin, go to "Users" section
- Click "Create User"
- Fill in details and select appropriate role
- Created users can now sign in normally

## Troubleshooting

### Error: "Invalid login credentials"

**Causes:**
1. User doesn't exist in Supabase Auth
2. Wrong password
3. Email typo
4. User was created but email isn't confirmed

**Solutions:**
1. **Check if user exists:**
   - Go to Supabase Dashboard → Authentication → Users
   - Look for the email address
   - If not found, create the user via signup

2. **Password reset (if needed):**
   - In Supabase Dashboard → Authentication → Users
   - Click on the user
   - Click "Send password recovery email" OR
   - Manually set a new password

3. **Check email confirmation:**
   - In Supabase Dashboard → Authentication → Users
   - Verify "Email Confirmed" is checked
   - If not, click the user and manually confirm

### Error: "Failed to fetch profile"

**Cause:** User exists in Supabase Auth but not in KV store

**Solution:**
Run this script to sync:
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-2eb59763/temp/sync-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "name": "User Name",
    "role": "student"
  }'
```

(You'll need to create this temporary endpoint)

### Quick Test Script

Save this as a `.sh` file and run it to create all test accounts:

```bash
#!/bin/bash

PROJECT_ID="your_project_id"
ANON_KEY="your_anon_key"
BASE_URL="https://$PROJECT_ID.supabase.co/functions/v1/make-server-2eb59763"

echo "Creating test accounts..."

# Create students
curl -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"email":"student1@test.com","password":"test123","name":"Test Student 1"}'

curl -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"email":"student2@test.com","password":"test123","name":"Test Student 2"}'

echo "Test accounts created!"
echo ""
echo "Now manually update one student to admin role in Supabase Dashboard"
echo "Then sign in as admin and create interviewer accounts from the UI"
```

## Verification Steps

After creating accounts, verify they work:

1. **Test Student Login:**
   - Go to `/signin`
   - Email: student1@test.com
   - Password: test123
   - Should redirect to `/student`

2. **Test Admin Login:**
   - Go to `/signin`
   - Email: admin@test.com (or whatever you created)
   - Password: [your password]
   - Should redirect to `/admin`

3. **Test Interviewer Login:**
   - Go to `/signin`
   - Email: interviewer1@test.com (created by admin)
   - Password: [set by admin]
   - Should redirect to `/interviewer`

## Production Setup

For production:

1. **Disable public signup** (or keep it for students only)
2. **Create admin accounts manually** via Supabase Dashboard
3. **Use strong passwords** (minimum 12 characters)
4. **Enable email confirmation** if you have an email service configured
5. **Set up password policies** in Supabase Auth settings

## Security Best Practices

- ✅ Never use default passwords in production
- ✅ Always verify email addresses
- ✅ Use different passwords for each test account
- ✅ Delete test accounts before going live
- ✅ Enable 2FA for admin accounts (future enhancement)
- ✅ Regularly rotate admin passwords

---

## Quick Start (TL;DR)

1. Go to `/signup` and create an account
2. Go to Supabase Dashboard → Table Editor → kv_store_2eb59763
3. Find your user entry (key starts with `user:`)
4. Edit the JSON value and change `"role": "student"` to `"role": "admin"`
5. Go to `/signin` and sign in
6. You're now admin! Create other users from the dashboard.

---

Need help? Check the error message in browser console for more details.
