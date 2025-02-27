-- Add avatar column to user_settings table
ALTER TABLE IF EXISTS user_settings 
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Update RLS policy for avatar
-- No need to modify existing policies as they already cover the new field