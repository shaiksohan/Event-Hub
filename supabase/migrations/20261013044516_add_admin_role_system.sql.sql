/*
# Add Admin Role System

1. Changes
- The `profiles.role` column already exists as text with default 'customer'.
  It already accepts arbitrary text values, so 'admin' is automatically supported.
  No column change is needed — we only need to set the website owner's role to 'admin'.
- Set the first registered user (rupesh, id: 62453a42-6a2d-4fa5-b330-dbcef04a998c) 
  as the website admin.

2. Security
- No new tables or policies needed. The admin role check is done in the frontend
  by reading profile.role === 'admin'. The existing RLS policies on all tables 
  remain unchanged — admin reads data through the same authenticated policies 
  as any other user, which is sufficient for viewing.
- Provider payouts and escrow release are handled through existing database 
  functions and the service_role edge functions, not client-side admin actions.

3. Important Notes
- Only users with role = 'admin' in the profiles table can access the admin dashboard.
- The admin can view all users, providers, bookings, payment screenshots, 
  transactions, and payouts.
- The admin can verify payment screenshots and trigger escrow release to providers.
*/

UPDATE profiles SET role = 'admin' WHERE id = '62453a42-6a2d-4fa5-b330-dbcef04a998c';
