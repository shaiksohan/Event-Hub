/*
  Add UPI ID to profiles.

  This migration adds the column without changing existing data
  or modifying Row Level Security policies.
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS upi_id text;