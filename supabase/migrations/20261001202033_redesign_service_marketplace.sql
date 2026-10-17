/*
# EventHub - Redesign for Service Marketplace

## Overview
Redesigns EventHub from an event booking platform to a service marketplace
with four service categories: Photo, Camera Studio, Catering, and Workers.
Both customers and service providers can use the platform.

## Changes

### profiles table - add role column
- `role` (text, default 'customer') - 'customer' or 'provider'
- `business_name` (text) - for providers
- `service_type` (text) - which service category the provider offers

### services table (renamed from events concept)
- `id` (uuid, PK)
- `provider_id` (uuid, references auth.users) - the service provider
- `title` (text)
- `description` (text)
- `service_type` (text) - 'photo', 'camera_studio', 'catering', 'workers'
- `price` (numeric) - starting price
- `price_unit` (text) - 'per_hour', 'per_day', 'per_event', 'per_person'
- `city` (text)
- `address` (text)
- `image_url` (text)
- `gallery_urls` (text[]) - multiple images
- `rating` (numeric, default 0)
- `review_count` (int, default 0)
- `available` (boolean, default true)
- `created_at` (timestamptz)

### bookings table - update for services
- `id` (uuid, PK)
- `user_id` (uuid) - customer who books
- `service_id` (uuid, references services)
- `provider_id` (uuid) - service provider
- `booking_date` (date) - when service is needed
- `booking_time` (text) - time of day
- `duration_hours` (int) - for hourly services
- `num_guests` (int) - for catering
- `notes` (text) - customer notes
- `total_price` (numeric)
- `status` (text) - 'pending', 'confirmed', 'completed', 'cancelled'
- `created_at` (timestamptz)

### favorites table - update for services
- `id` (uuid, PK)
- `user_id` (uuid)
- `service_id` (uuid, references services)
- `created_at` (timestamptz)

### reviews table - new
- `id` (uuid, PK)
- `service_id` (uuid, references services)
- `user_id` (uuid) - reviewer
- `rating` (int, 1-5)
- `comment` (text)
- `created_at` (timestamptz)

## Security
- RLS on all tables
- Services: public read, provider can insert/update/delete own
- Bookings: customer can CRUD own bookings; provider can read bookings for their services and update status
- Favorites: user can CRUD own favorites
- Reviews: public read, user can insert own, update/delete own
*/

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_type text DEFAULT '';

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  service_type text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  price_unit text NOT NULL DEFAULT 'per_event',
  city text NOT NULL,
  address text DEFAULT '',
  image_url text DEFAULT '',
  gallery_urls text[] DEFAULT '{}',
  rating numeric DEFAULT 0,
  review_count int DEFAULT 0,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_read_all" ON services;
CREATE POLICY "services_read_all" ON services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "services_insert_own" ON services;
CREATE POLICY "services_insert_own" ON services FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "services_update_own" ON services;
CREATE POLICY "services_update_own" ON services FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "services_delete_own" ON services;
CREATE POLICY "services_delete_own" ON services FOR DELETE
  TO authenticated USING (auth.uid() = provider_id);

-- Create bookings table (new, for services)
CREATE TABLE IF NOT EXISTS service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  booking_time text DEFAULT '',
  duration_hours int DEFAULT 1,
  num_guests int DEFAULT 1,
  notes text DEFAULT '',
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;

-- Customer can read own bookings
DROP POLICY IF EXISTS "sbookings_select_customer" ON service_bookings;
CREATE POLICY "sbookings_select_customer" ON service_bookings FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = provider_id);

-- Customer can insert own bookings
DROP POLICY IF EXISTS "sbookings_insert_customer" ON service_bookings;
CREATE POLICY "sbookings_insert_customer" ON service_bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Customer can update own bookings (e.g. cancel)
DROP POLICY IF EXISTS "sbookings_update_customer" ON service_bookings;
CREATE POLICY "sbookings_update_customer" ON service_bookings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = provider_id);

-- Customer can delete own bookings
DROP POLICY IF EXISTS "sbookings_delete_customer" ON service_bookings;
CREATE POLICY "sbookings_delete_customer" ON service_bookings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create service_favorites table
CREATE TABLE IF NOT EXISTS service_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service_id)
);

ALTER TABLE service_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sfavorites_select_own" ON service_favorites;
CREATE POLICY "sfavorites_select_own" ON service_favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sfavorites_insert_own" ON service_favorites;
CREATE POLICY "sfavorites_insert_own" ON service_favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sfavorites_delete_own" ON service_favorites;
CREATE POLICY "sfavorites_delete_own" ON service_favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_read_all" ON reviews;
CREATE POLICY "reviews_read_all" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_city ON services(city);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_sbookings_user ON service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_sbookings_provider ON service_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_sbookings_service ON service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_sfavorites_user ON service_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id);
