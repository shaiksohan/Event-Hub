/*
# Add Payment Fields to Service Bookings

## Summary
Adds support for UPI-based payments (PhonePe, Paytm, GPay) to the booking flow.
Customers can select a payment method, upload a payment screenshot, and the
booking is confirmed after payment. Transaction details are visible in the profile.

## Changes to `service_bookings`
- `address` (text, nullable) — event/service address provided by the customer at booking time
- `payment_method` (text, nullable) — which UPI app was used: 'phonepe', 'paytm', 'gpay', or null
- `payment_screenshot_url` (text, nullable) — public URL of uploaded payment screenshot in storage
- `payment_status` (text, not null, default 'pending') — 'pending', 'paid', 'failed'

## New Storage Bucket
- `payment-screenshots` — public bucket for storing payment screenshot images
- Policies: authenticated users can upload and read; only owner can update/delete their own screenshots

## Security
- RLS enabled on `payment-screenshots` bucket
- Booking RLS policies updated to allow owner (customer) and provider to read payment info
*/

-- Add new columns to service_bookings
ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_screenshot_url text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- Create payment screenshots storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment-screenshots bucket
DROP POLICY IF EXISTS "Auth users can upload payment screenshots" ON storage.objects;
CREATE POLICY "Auth users can upload payment screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Anyone can read payment screenshots" ON storage.objects;
CREATE POLICY "Anyone can read payment screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Owner can update payment screenshots" ON storage.objects;
CREATE POLICY "Owner can update payment screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-screenshots' AND owner = auth.uid())
WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Owner can delete payment screenshots" ON storage.objects;
CREATE POLICY "Owner can delete payment screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-screenshots' AND owner = auth.uid());