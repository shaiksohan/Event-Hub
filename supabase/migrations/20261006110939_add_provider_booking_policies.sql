/*
  Add provider access to service bookings.

  Providers can:
  - View bookings assigned to them.
  - Update bookings assigned to them.
  - Delete bookings assigned to them.

  Customers retain their existing policies.
*/

-- =====================================================
-- 1. PROVIDERS CAN VIEW THEIR BOOKINGS
-- =====================================================

DROP POLICY IF EXISTS "bookings_select_provider"
ON public.service_bookings;

CREATE POLICY "bookings_select_provider"
ON public.service_bookings
FOR SELECT
TO authenticated
USING (
  auth.uid() = provider_id
);


-- =====================================================
-- 2. PROVIDERS CAN UPDATE THEIR BOOKINGS
-- =====================================================

DROP POLICY IF EXISTS "bookings_update_provider"
ON public.service_bookings;

CREATE POLICY "bookings_update_provider"
ON public.service_bookings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = provider_id
)
WITH CHECK (
  auth.uid() = provider_id
);


-- =====================================================
-- 3. PROVIDERS CAN DELETE THEIR BOOKINGS
-- =====================================================

DROP POLICY IF EXISTS "bookings_delete_provider"
ON public.service_bookings;

CREATE POLICY "bookings_delete_provider"
ON public.service_bookings
FOR DELETE
TO authenticated
USING (
  auth.uid() = provider_id
);