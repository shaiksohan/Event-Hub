/*
# Create AI Chat Logs Table for Rate Limiting & Analytics

1. New Tables
- `ai_chat_logs`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users)
  - `message` (text, the user's message to the assistant)
  - `response` (text, the assistant's response)
  - `search_results_count` (int, number of services found, default 0)
  - `created_at` (timestamptz, defaults to now)

2. Security
- Enable RLS on `ai_chat_logs`.
- Owner-scoped: each authenticated user can only read their own chat logs.
- INSERT is owner-scoped (user_id defaults to auth.uid()).
- No UPDATE or DELETE from the client — logs are append-only.
- The edge function uses the service role key which bypasses RLS for inserts and rate-limit queries.

3. Index
- Index on (user_id, created_at) for efficient rate-limit queries.
*/

CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text NOT NULL,
  search_results_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_chat_logs" ON ai_chat_logs;
CREATE POLICY "select_own_ai_chat_logs" ON ai_chat_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_chat_logs" ON ai_chat_logs;
CREATE POLICY "insert_own_ai_chat_logs" ON ai_chat_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_user_created ON ai_chat_logs (user_id, created_at DESC);
