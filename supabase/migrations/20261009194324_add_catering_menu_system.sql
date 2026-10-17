/*
# Add Catering Menu System

1. New Tables
- `service_menu_items`: Stores menu items created by catering providers (name, description, price, category, veg/non-veg, optional image)
- `booking_menu_selections`: Stores customer-selected menu items linked to a booking (with quantity)

2. Security
- RLS enabled on both tables.
- service_menu_items: providers can CRUD their own menu items (ownership checked via service.provider_id); anyone can read (customers browsing).
- booking_menu_selections: customers can insert/read/update/delete their own selections; providers can read selections for bookings they own.

3. Relationship
- service_menu_items references services(id) ON DELETE CASCADE
- booking_menu_selections references service_bookings(id) and service_menu_items(id) ON DELETE CASCADE
*/

CREATE TABLE IF NOT EXISTS service_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Main Course',
  is_veg boolean NOT NULL DEFAULT true,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_menu_items" ON service_menu_items;
CREATE POLICY "read_menu_items"
ON service_menu_items FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "insert_own_menu_items" ON service_menu_items;
CREATE POLICY "insert_own_menu_items"
ON service_menu_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_id
    AND services.provider_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_own_menu_items" ON service_menu_items;
CREATE POLICY "update_own_menu_items"
ON service_menu_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_menu_items.service_id
    AND services.provider_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_menu_items.service_id
    AND services.provider_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_own_menu_items" ON service_menu_items;
CREATE POLICY "delete_own_menu_items"
ON service_menu_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_menu_items.service_id
    AND services.provider_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_menu_items_service_id ON service_menu_items(service_id);

CREATE TABLE IF NOT EXISTS booking_menu_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES service_menu_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_menu_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_or_provider_menu_selections" ON booking_menu_selections;
CREATE POLICY "select_own_or_provider_menu_selections"
ON booking_menu_selections FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM service_bookings
    WHERE service_bookings.id = booking_menu_selections.booking_id
    AND service_bookings.provider_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_own_menu_selections" ON booking_menu_selections;
CREATE POLICY "insert_own_menu_selections"
ON booking_menu_selections FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_menu_selections" ON booking_menu_selections;
CREATE POLICY "update_own_menu_selections"
ON booking_menu_selections FOR UPDATE
TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_menu_selections" ON booking_menu_selections;
CREATE POLICY "delete_own_menu_selections"
ON booking_menu_selections FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_menu_selections_booking_id ON booking_menu_selections(booking_id);
