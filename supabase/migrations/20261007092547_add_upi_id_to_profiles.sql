/*
# Add UPI ID to profiles

1. Changes
- Add `upi_id` column (text, nullable) to `profiles` table.
- This allows service providers to store their UPI ID so customers can pay directly via UPI deep links and QR codes.
2. Security
- No changes to RLS. Existing profile policies already allow authenticated users to read profiles and update their own.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'upi_id') THEN
    ALTER TABLE profiles ADD COLUMN upi_id text;
  END IF;
END $$;
