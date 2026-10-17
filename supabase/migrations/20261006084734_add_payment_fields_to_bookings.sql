/*
  Add payment fields to service bookings and create
  private storage for payment screenshots.
*/

-- =====================================================
-- 1. ADD PAYMENT FIELDS
-- =====================================================

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_screenshot_url text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';


-- =====================================================
-- 2. VALIDATE PAYMENT STATUS AND METHOD
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_bookings_payment_status_check'
      AND conrelid = 'public.service_bookings'::regclass
  ) THEN
    ALTER TABLE public.service_bookings
      ADD CONSTRAINT service_bookings_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_bookings_payment_method_check'
      AND conrelid = 'public.service_bookings'::regclass
  ) THEN
    ALTER TABLE public.service_bookings
      ADD CONSTRAINT service_bookings_payment_method_check
      CHECK (
        payment_method IS NULL
        OR payment_method IN ('phonepe', 'paytm', 'gpay')
      );
  END IF;
END
$$;


-- =====================================================
-- 3. CREATE PRIVATE PAYMENT SCREENSHOT BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO UPDATE SET public = false;


-- =====================================================
-- 4. RESTRICT UPLOADS TO THE USER'S OWN FOLDER
-- =====================================================

DROP POLICY IF EXISTS "Auth users can upload payment screenshots"
ON storage.objects;

CREATE POLICY "Auth users can upload payment screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- =====================================================
-- 5. RESTRICT READ ACCESS TO THE FILE OWNER
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read payment screenshots"
ON storage.objects;

CREATE POLICY "Owners can read payment screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- =====================================================
-- 6. RESTRICT UPDATES TO THE FILE OWNER
-- =====================================================

DROP POLICY IF EXISTS "Owner can update payment screenshots"
ON storage.objects;

CREATE POLICY "Owner can update payment screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- =====================================================
-- 7. RESTRICT DELETIONS TO THE FILE OWNER
-- =====================================================

DROP POLICY IF EXISTS "Owner can delete payment screenshots"
ON storage.objects;

CREATE POLICY "Owner can delete payment screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);