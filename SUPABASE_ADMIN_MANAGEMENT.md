# Managing Admins in Supabase

## View Current Admins

Run in Supabase SQL Editor:

```sql
SELECT id, role, created_at FROM user_profiles WHERE role = 'admin';
```

## Make a User Admin

Find the user ID from **Authentication → Users**, then run:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'paste-user-id-here';
```

## Remove Admin Role

```sql
UPDATE user_profiles 
SET role = 'user' 
WHERE id = 'paste-user-id-here';
```

## Check User Profiles Table

```sql
SELECT * FROM user_profiles;
```

## Notes

- **First user to register** automatically becomes admin
- Admin can manage products and view all orders
- Regular users can only shop and view their own orders
- All role data is stored in Supabase `user_profiles` table
