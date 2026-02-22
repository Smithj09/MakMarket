# Supabase Setup Guide

## Prerequisites

Make sure you have:
1. A Supabase account (https://supabase.com)
2. Node.js and npm installed

## Step-by-Step Setup

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose a name, password, and region
4. Wait for the project to be created

### 2. Get Your API Credentials

1. Go to **Settings → API**
2. Copy your **Project URL** (Supabase URL)
3. Copy the **anon public key** (Anon Key)

### 3. Update Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Create Database Tables

Go to your Supabase project's SQL Editor and run these queries:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Your App

```bash
npm run dev
```

## Features

- **Email Authentication**: Users register and login with email/password
- **Role-based Access**: Admin users can manage products and view all orders
- **Session Management**: Automatic session persistence and recovery
- **Products**: Fetched from the backend API
- **Orders**: Users can place orders which are stored in the backend

## Environment Variables

Your `.env.local` file should contain:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Important Notes

- Email verification may be required depending on your Supabase email settings
- First user can be set as admin manually in the user_profiles table
- The app still uses your Node.js backend API for products and orders
- Supabase handles authentication only
