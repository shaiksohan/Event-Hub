/*
# EventHub - Core Schema

## Overview
Creates the core tables for EventHub, an event booking platform with user accounts,
event discovery, booking management, and favorites.

## New Tables

1. `profiles` - User profile information (extends Supabase auth.users)
   - `id` (uuid, PK, references auth.users)
   - `full_name` (text)
   - `bio` (text)
   - `avatar_url` (text)
   - `phone` (text)
   - `location` (text)
   - `website` (text)
   - `created_at` (timestamptz)

2. `events` - Event listings
   - `id` (uuid, PK)
   - `title` (text)
   - `description` (text)
   - `category` (text)
   - `event_date` (timestamptz)
   - `venue` (text)
   - `address` (text)
   - `city` (text)
   - `price` (numeric)
   - `capacity` (int)
   - `image_url` (text)
   - `organizer` (text)
   - `created_at` (timestamptz)

3. `bookings` - User bookings for events
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `event_id` (uuid, references events)
   - `num_tickets` (int)
   - `total_price` (numeric)
   - `status` (text, default 'confirmed')
   - `created_at` (timestamptz)

4. `favorites` - User favorite events
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `event_id` (uuid, references events)
   - `created_at` (timestamptz)

## Security
- RLS enabled on all tables
- profiles: users can read all profiles, update only their own
- events: readable by all (anon + authenticated), no public writes
- bookings: users can CRUD only their own bookings
- favorites: users can CRUD only their own favorites
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  location text DEFAULT '',
  website text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  event_date timestamptz NOT NULL,
  venue text NOT NULL,
  address text DEFAULT '',
  city text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  capacity int NOT NULL DEFAULT 100,
  image_url text DEFAULT '',
  organizer text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_read_all" ON events;
CREATE POLICY "events_read_all" ON events FOR SELECT
  TO anon, authenticated USING (true);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  num_tickets int NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_delete_own" ON bookings;
CREATE POLICY "bookings_delete_own" ON bookings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
