-- Enhance user plans with subscription details
-- Add columns to user_settings table for plan management

-- First, add plan-specific columns to the user_settings table
ALTER TABLE user_settings 
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,                    -- Will store Stripe subscription ID later
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free',           -- 'free', 'professional', 'enterprise'
  ADD COLUMN IF NOT EXISTS monthly_report_limit INTEGER DEFAULT 5,  -- Default limit for free tier
  ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 100,    -- Default storage limit for free tier
  ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ,      -- When the paid subscription starts
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,        -- When the subscription ends (if applicable)
  ADD COLUMN IF NOT EXISTS is_subscription_active BOOLEAN DEFAULT TRUE; -- Whether the subscription is currently active

-- Create a function to set default plan limits based on tier
CREATE OR REPLACE FUNCTION update_plan_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Set plan limits based on the tier
  IF NEW.plan_tier = 'free' THEN
    NEW.monthly_report_limit := 5;
    NEW.storage_limit_mb := 100;
  ELSIF NEW.plan_tier = 'professional' THEN
    NEW.monthly_report_limit := NULL; -- NULL indicates unlimited
    NEW.storage_limit_mb := 1000;
  ELSIF NEW.plan_tier = 'enterprise' THEN
    NEW.monthly_report_limit := NULL; -- NULL indicates unlimited
    NEW.storage_limit_mb := NULL;    -- NULL indicates unlimited
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update limits when plan changes
CREATE OR REPLACE TRIGGER set_plan_limits_trigger
  BEFORE INSERT OR UPDATE OF plan_tier ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_limits();

-- Function to check if a user can generate more reports this month
CREATE OR REPLACE FUNCTION can_generate_report(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_limit INTEGER;
  current_usage INTEGER;
  is_active BOOLEAN;
BEGIN
  -- Get the user's monthly limit and subscription status
  SELECT 
    monthly_report_limit, 
    is_subscription_active INTO user_plan_limit, is_active
  FROM 
    user_settings
  WHERE 
    user_id = p_user_id;

  -- If the subscription isn't active, they can't use the service
  IF NOT is_active THEN
    RETURN FALSE;
  END IF;

  -- If the limit is NULL, it means unlimited
  IF user_plan_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get current usage
  SELECT 
    COUNT(*) INTO current_usage
  FROM 
    report_generations
  WHERE 
    user_id = p_user_id
    AND generated_at >= date_trunc('month', now())
    AND generated_at < date_trunc('month', now()) + interval '1 month';

  -- Return TRUE if user has not exceeded their limit
  RETURN current_usage < user_plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create reference table for plan features (useful for UI)
CREATE TABLE IF NOT EXISTS plan_features (
  plan_tier TEXT PRIMARY KEY,
  monthly_price_usd DECIMAL(10, 2),
  features JSONB,
  description TEXT,
  is_published BOOLEAN DEFAULT TRUE
);

-- Insert default plan tiers
INSERT INTO plan_features (plan_tier, monthly_price_usd, features, description)
VALUES 
  ('free', 0, '["5 reports per month", "100MB storage", "Basic templates"]'::JSONB, 
   'Perfect for individuals just getting started'),
  ('professional', 19.99, '["Unlimited reports", "1GB storage", "Advanced templates", "Priority support"]'::JSONB, 
   'For professionals who need more power'),
  ('enterprise', 49.99, '["Unlimited reports", "Unlimited storage", "Custom templates", "Dedicated support", "Advanced analytics"]'::JSONB, 
   'For teams and businesses with advanced needs')
ON CONFLICT (plan_tier) DO UPDATE
SET 
  monthly_price_usd = EXCLUDED.monthly_price_usd,
  features = EXCLUDED.features,
  description = EXCLUDED.description;

-- Enable RLS on plan_features
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read plan features 
CREATE POLICY "Anyone can read plan features" 
  ON plan_features 
  FOR SELECT 
  USING (TRUE);

-- Only allow admins to modify plan features
CREATE POLICY "Only admins can modify plan features" 
  ON plan_features 
  FOR ALL 
  USING (auth.uid() IN (SELECT auth.uid() FROM user_settings WHERE plan_tier = 'enterprise'))
  WITH CHECK (auth.uid() IN (SELECT auth.uid() FROM user_settings WHERE plan_tier = 'enterprise'));

-- Grant access to authenticated users
GRANT SELECT ON plan_features TO authenticated;

-- Add comments
COMMENT ON TABLE plan_features IS 'Contains information about different subscription plans and their features';
COMMENT ON COLUMN user_settings.plan_tier IS 'Subscription tier: free, professional, or enterprise';
COMMENT ON COLUMN user_settings.monthly_report_limit IS 'Maximum number of reports per month, NULL means unlimited';
COMMENT ON COLUMN user_settings.storage_limit_mb IS 'Storage limit in MB, NULL means unlimited';