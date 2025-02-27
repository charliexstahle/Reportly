-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- Script Library Entries Table
-------------------------------------------------
CREATE TABLE IF NOT EXISTS script_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sql_script text NOT NULL,
  categories text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  version text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for the table
ALTER TABLE script_library ENABLE ROW LEVEL SECURITY;

-- Create open policies for testing purposes:
CREATE POLICY "Allow all selects" ON script_library
  FOR SELECT
  USING (true);
CREATE POLICY "Allow all inserts" ON script_library
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow all updates" ON script_library
  FOR UPDATE
  USING (true);

-------------------------------------------------
-- Design Templates Table
-------------------------------------------------
CREATE TABLE IF NOT EXISTS design_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  design_content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);