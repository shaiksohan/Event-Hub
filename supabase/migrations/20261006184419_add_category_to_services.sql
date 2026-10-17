/*
# Add Category Column to Services

## Summary
Adds a `category` column to the `services` table so providers can classify
their services into sub-categories (e.g. "Weddings" under Function Service,
"Wedding Photography" under Camera Studio, "Wedding Catering" under Catering).

## Changes
- New column: `services.category` (text, nullable, default '')
  - Stores the sub-category name (e.g. "Weddings", "Wedding Photography")
- The column is nullable so existing services don't break

## Security
- No RLS policy changes needed — the new column is covered by existing
  service policies (providers can write their own rows, all users can read).
*/

ALTER TABLE services ADD COLUMN IF NOT EXISTS category text DEFAULT '';
