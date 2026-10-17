/*
# Add personal information fields to profiles table

1. New Columns on `profiles`
- `gender` (text, nullable) — user's gender: 'male', 'female', 'other', or null
- `date_of_birth` (date, nullable) — user's date of birth
- `languages` (text, nullable) — comma-separated list of languages spoken

2. Security
- No RLS changes needed — the profiles table already has owner-scoped RLS policies.
- The new columns are covered by existing UPDATE/SELECT policies since they are on the same table.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages text;
