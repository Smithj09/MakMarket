# Supabase Database Setup for Adorly Market

## Create Tables

Run these SQL commands in your Supabase SQL Editor:

### 1. Create User Profiles Table

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role can do anything (for admin operations)
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');
```

## Admin User Setup

### Option 1: First User Becomes Admin (Automatic)
- The first user to register will automatically be set as **admin**
- Just register with an email and password
- You'll see "You are an admin" message

### Option 2: Manually Set Admin via Supabase Dashboard
1. Go to your Supabase project
2. Click **SQL Editor** → **New Query**
3. Run this query with the user's ID:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'user-id-here';
```

Find the user ID in **Authentication** → **Users** tab.

## Admin Features

Once you're an admin:
- Click **Dashboard** button in the navbar
- **Products tab**: Add, edit, delete products
- **Orders tab**: View all orders and update their status

## Environment Variables

Make sure your `.env.local` has:

```
VITE_SUPABASE_URL=https://qsamgeehagjairhadkve.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_brd5o3z9NaTkEp9XB74eOQ_oLuQVl93
```

## Testing

1. Start the app: `npm run dev`
2. Register first user → automatically becomes admin
3. Click Dashboard button to access admin panel
4. Add products, manage orders
