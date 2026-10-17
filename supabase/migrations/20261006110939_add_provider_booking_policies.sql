/*
# Add Provider Access to Service Bookings

## Summary
Currently, RLS policies on `service_bookings` only allow the customer (user_id) to
select, update, and delete their own bookings. Providers cannot manage bookings
assigned to them. This migration adds provider-scoped policies so providers can
view, update status, and delete bookings for their services.

## Changes
- New SELECT policy: providers can view bookings where they are the provider
- New UPDATE policy: providers can update bookings where they are the provider
- New DELETE policy: providers can delete bookings where they are the provider
- Existing customer policies remain unchanged

## Security
- Provider policies use `auth.uid() = provider_id`
- Customer policies use `auth.uid() = user_id`
- Both are scoped — no blanket access
*/

-- Provider can view bookings assigned to them
DROP POLICY IF EXISTS "bookings_select_provider" ON service_bookings;
CREATE POLICY "bookings_select_provider"
ON service_bookings FOR SELECT
TO authenticated
USING (auth.uid() = provider_id);

-- Provider can update bookings assigned to them
DROP POLICY IF EXISTS "bookings_update_provider" ON service_bookings;
CREATE POLICY "bookings_update_provider"
ON service_bookings FOR UPDATE
TO authenticated
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Provider can delete bookings assigned to them
DROP POLICY IF EXISTS "bookings_delete_provider" ON service_bookings;
CREATE POLICY "bookings_delete_provider"
ON service_bookings FOR DELETE
TO authenticated
USING (auth.uid() = provider_id);