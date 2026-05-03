# Quick Fix for "Invalid Login Credentials" Error

## The Problem

You're getting "Invalid login credentials" because you're trying to sign in with an account that doesn't exist in the system yet.

## ✨ NEW: Auto-Sync Feature

**Good news!** The system now automatically creates missing user profiles when you sign in. If a user exists in Supabase Auth but not in the application database, the profile will be created automatically.

This means in most cases, you just need to:
1. Create an account in Supabase Auth (via signup or manual creation)
2. Sign in - the profile will be synced automatically!

## The Solution (Choose One)

### Option 1: Create a New Account via SignUp (Easiest)

1. **Go to the SignUp page** in your app: `/signup`
2. **Fill in the form:**
   ```
   Name: Admin User
   Email: admin@test.com
   Password: admin123456
   Confirm Password: admin123456
   ```
3. **Click "Sign Up"**
4. **Important:** The account will be created as a "student" by default
5. **Manually update to admin:**
   - Go to your Supabase Dashboard
   - Navigate to: Table Editor → `kv_store_2eb59763` table
   - Find the row where the key starts with `user:` and the value contains your email
   - Click Edit
   - In the JSON value, change `"role": "student"` to `"role": "admin"`
   - Save
6. **Sign in** at `/signin` with your credentials
7. **You're now admin!** You can create other users from the admin panel

### Option 2: Quick API Call (Faster)

If you have `curl` or an API client:

```bash
# Replace YOUR_PROJECT_ID with your Supabase project ID
# Replace YOUR_ANON_KEY with your Supabase anon key (from /utils/supabase/info.tsx)

curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-2eb59763/auth/signup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123456",
    "name": "Admin User"
  }'
```

Then follow step 5-7 from Option 1 to make the user an admin.

### Option 3: Using Browser Console (Developer)

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Paste this code (replace the values):

```javascript
const projectId = 'YOUR_PROJECT_ID';  // Get from /utils/supabase/info.tsx
const publicAnonKey = 'YOUR_ANON_KEY'; // Get from /utils/supabase/info.tsx

fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2eb59763/auth/signup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`
  },
  body: JSON.stringify({
    email: 'admin@test.com',
    password: 'admin123456',
    name: 'Admin User'
  })
})
.then(res => res.json())
.then(data => console.log('User created:', data))
.catch(err => console.error('Error:', err));
```

Then follow step 5-7 from Option 1 to make the user an admin.

## Step-by-Step: Making User Admin in Supabase

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Click "Table Editor" in left sidebar**
4. **Select the `kv_store_2eb59763` table**
5. **Look for your user:**
   - Find the row where "key" starts with `user:`
   - Look at the "value" column to find your email
6. **Click the Edit button (pencil icon) on that row**
7. **Edit the JSON value:**
   - Find `"role": "student"`
   - Change it to `"role": "admin"`
8. **Click Save**
9. **Done!** Now you can sign in as admin

## Visual Guide for Supabase Dashboard

```
Supabase Dashboard
  └─ Table Editor
      └─ kv_store_2eb59763
          └─ Find row with key: "user:abc123..."
              └─ Value column shows: { "id": "...", "email": "admin@test.com", "role": "student", ... }
                  └─ Click Edit
                      └─ Change "student" to "admin"
                          └─ Save
```

## After Creating Admin Account

Once you have an admin account:

1. **Sign in** at `/signin`
2. **Go to Admin Dashboard** (you'll be redirected automatically)
3. **Click "Users"** in the sidebar
4. **Click "Create User"** button
5. **Create additional accounts:**
   - Interviewers
   - More students
   - More admins

These users can then sign in normally without any database editing!

## Test Credentials (After Creation)

Use these for testing:

```
Admin:
  Email: admin@test.com
  Password: admin123456
  
Student (create via signup or admin panel):
  Email: student@test.com
  Password: student123
  
Interviewer (create via admin panel):
  Email: interviewer@test.com
  Password: interview123
```

## Troubleshooting

### "User already exists"
- Use a different email address, or
- Sign in with the existing account

### "Failed to fetch profile"
- The user exists in Auth but not in the KV store
- Delete the user from Supabase Auth and try again, or
- Contact support

### "Forbidden: Admin access required"
- You're signed in but not as admin
- Follow the steps above to change your role to admin

### Still having issues?
1. Check browser console for detailed error messages
2. Check Supabase logs in Dashboard → Logs → Edge Functions
3. Verify your Supabase project is active
4. Try creating a new account with a different email

## Production Note

⚠️ **Security Warning:** 
- Change default passwords before deploying to production
- Don't share admin credentials
- Consider disabling public signup in production
- Enable email verification in Supabase Auth settings

---

**Quick Summary:**
1. Go to `/signup` 
2. Create account
3. Change role to "admin" in Supabase Dashboard → Table Editor
4. Sign in
5. Create other users from admin panel

That's it! 🎉