/*
# Redesign service booking details

1. New columns on `service_bookings`
- `booking_end_date` (date, nullable) stores the requested end date for multi-day bookings.
- `booking_end_time` (text, nullable) stores the requested end time.
- `customer_name` (text, nullable) stores the name supplied during booking.
- `customer_phone` (text, nullable) stores the phone number supplied during booking.

2. Modified booking behavior
- Existing bookings remain unchanged because every new column is nullable.
- The payment method remains a text value so the booking form can support UPI, card, and cash on delivery without changing existing rows.

3. Security
- No new tables or access policies are introduced.
- Existing `service_bookings` RLS policies continue to protect booking data for signed-in customers and providers.

4. Important notes
- The new fields support the single-page booking form and do not remove any existing booking data.
*/

ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS booking_end_date date,
  ADD COLUMN IF NOT EXISTS booking_end_time text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text;