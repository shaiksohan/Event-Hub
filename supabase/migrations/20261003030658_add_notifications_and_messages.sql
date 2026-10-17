/*
  EventHub notifications and direct messages.

  Security:
  - Users can read their own notifications.
  - Authenticated users can create notifications as themselves.
  - Users can update their own notifications.
  - Only message participants can read messages.
  - Only the sender can create messages.
  - Message participants can update messages and delete messages.
*/

-- =====================================================
-- 1. NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_id uuid,
  entity_type text,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications"
ON public.notifications;

CREATE POLICY "select_own_notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


DROP POLICY IF EXISTS "insert_notifications"
ON public.notifications;

CREATE POLICY "insert_notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = actor_id
  AND user_id <> auth.uid()
  AND type IN ('follow', 'like', 'comment', 'booking', 'message')
  AND (
    entity_type IS NULL
    OR entity_type IN ('reel', 'service', 'booking')
  )
);


DROP POLICY IF EXISTS "update_own_notifications"
ON public.notifications;

CREATE POLICY "update_own_notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications(user_id, created_at DESC);


-- =====================================================
-- 2. MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT messages_no_self_message
    CHECK (sender_id <> receiver_id),

  CONSTRAINT messages_content_not_empty
    CHECK (length(trim(content)) > 0)
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "select_own_messages"
ON public.messages;

CREATE POLICY "select_own_messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
);


DROP POLICY IF EXISTS "insert_own_messages"
ON public.messages;

CREATE POLICY "insert_own_messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND auth.uid() <> receiver_id
);


DROP POLICY IF EXISTS "update_own_messages"
ON public.messages;

CREATE POLICY "update_own_messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
)
WITH CHECK (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
);


DROP POLICY IF EXISTS "delete_own_messages"
ON public.messages;

CREATE POLICY "delete_own_messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
);


CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
ON public.messages(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON public.messages(sender_id, created_at DESC);


-- =====================================================
-- 3. ENABLE REALTIME SAFELY
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.messages;
  END IF;
END
$$;