/*
# Enable realtime on reels table

1. Changes
- Adds the `reels` table to the Supabase Realtime publication so INSERT and DELETE events
  are broadcast to all subscribed clients. This makes new reels appear in every user's
  feed automatically without needing to refresh the page.

2. Security
- No RLS changes — existing policies still apply.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE reels;
