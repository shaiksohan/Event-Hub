/*
# Add rich content columns to services table

## Changes
This migration adds structured content columns to the `services` table to support
professional, attractive service descriptions on the detail page and provider editing.

## New Columns
1. `highlights` (text[]) — Key selling points shown as checkmark bullets (e.g. "200+ edited photos", "Same-day teaser")
2. `inclusions` (text[]) — What's included in the package (e.g. "2 photographers", "1 printed album")
3. `exclusions` (text[]) — What's NOT included (e.g. "Travel outside city limits", "Extra prints")
4. `customization_options` (text[]) — Ways the service can be customized (e.g. "Add drone coverage", "Extra hours")
5. `suitable_occasions` (text[]) — Event types this service suits (e.g. "Weddings", "Birthdays", "Corporate Events")
6. `faqs` (jsonb) — Array of {question, answer} pairs, default '[]'
7. `packages` (jsonb) — Array of {name, price, description, features[]} for tiered pricing display, default '[]'
8. `booking_info` (text) — Additional booking instructions or requirements shown in booking section

## Important Notes
- All columns are nullable with sensible defaults so existing services still work
- No existing data is modified — only schema is extended
- Uses DO $$ ... END $$ for idempotency
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'highlights') THEN
    ALTER TABLE services ADD COLUMN highlights text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'inclusions') THEN
    ALTER TABLE services ADD COLUMN inclusions text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'exclusions') THEN
    ALTER TABLE services ADD COLUMN exclusions text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'customization_options') THEN
    ALTER TABLE services ADD COLUMN customization_options text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'suitable_occasions') THEN
    ALTER TABLE services ADD COLUMN suitable_occasions text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'faqs') THEN
    ALTER TABLE services ADD COLUMN faqs jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'packages') THEN
    ALTER TABLE services ADD COLUMN packages jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'booking_info') THEN
    ALTER TABLE services ADD COLUMN booking_info text DEFAULT '';
  END IF;
END $$;
