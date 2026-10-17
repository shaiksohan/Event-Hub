/*
# Restrict reel uploads to providers only

Changes:
- Drops the existing INSERT policy on reels that allowed any authenticated user to insert.
- Creates a new INSERT policy that only allows users whose profile role is 'provider'.
*/

DROP POLICY IF EXISTS "insert_own_reels" ON reels;

CREATE POLICY "insert_own_reels" ON reels
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'provider'
    )
  );
