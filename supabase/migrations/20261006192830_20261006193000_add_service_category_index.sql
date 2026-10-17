/*
# Improve service category browsing

1. Purpose
- Speeds up the public marketplace queries that filter services by their main service type and category.
- Keeps the existing category values and user data unchanged.

2. Modified Tables
- `services`
- Adds a composite index covering `service_type` and `category`.

3. Security
- No access rules or permissions are changed.
- Existing row-level security policies continue to control who can read and manage services.

4. Important Notes
- This is a non-destructive performance improvement.
- No columns are removed, renamed, or changed.
*/

CREATE INDEX IF NOT EXISTS services_service_type_category_idx
ON services (service_type, category);