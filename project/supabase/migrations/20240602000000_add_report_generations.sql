-- Create table for tracking report generations
-- First, check if the reports table exists, and if not, create a simplified version
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
        CREATE TABLE public.reports (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
        );
        
        -- Add RLS to reports table
        ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
        CREATE POLICY reports_user_policy ON public.reports FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Check if design_templates table exists, create it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'design_templates') THEN
        CREATE TABLE public.design_templates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            template_name TEXT NOT NULL,
            description TEXT,
            layout_config JSONB,
            logo_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
        );
        
        -- Add RLS to design_templates table
        ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;
        CREATE POLICY templates_user_policy ON public.design_templates FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Now create the report_generations table with nullable references
CREATE TABLE IF NOT EXISTS public.report_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  export_type TEXT NOT NULL, -- e.g., 'pdf', 'excel', 'csv'
  export_success BOOLEAN DEFAULT true,
  file_size_kb INTEGER,
  file_name TEXT,
  template_id UUID REFERENCES public.design_templates(id) ON DELETE SET NULL,
  
  -- Additional metadata for analytics
  generation_duration_ms INTEGER, -- How long it took to generate
  is_scheduled BOOLEAN DEFAULT false -- Whether this was a scheduled report
);

-- Create index to optimize queries that look up monthly report counts
CREATE INDEX IF NOT EXISTS idx_report_generations_user_date ON public.report_generations (user_id, generated_at);

-- Function to count user's report generations within current month
CREATE OR REPLACE FUNCTION get_monthly_report_generations(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*) 
  INTO count_result
  FROM public.report_generations
  WHERE user_id = p_user_id
  AND generated_at >= date_trunc('month', now())
  AND generated_at < date_trunc('month', now()) + interval '1 month';
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE public.report_generations ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own report generations
CREATE POLICY select_own_report_generations 
  ON public.report_generations FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own report generations
CREATE POLICY insert_own_report_generations
  ON public.report_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own report generations
CREATE POLICY update_own_report_generations
  ON public.report_generations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create view for easy monthly counts
CREATE OR REPLACE VIEW monthly_report_usage AS
SELECT 
  user_id,
  date_trunc('month', generated_at) AS month,
  COUNT(*) AS generation_count
FROM 
  public.report_generations
GROUP BY 
  user_id, date_trunc('month', generated_at);

-- Comment on the table and important columns
COMMENT ON TABLE public.report_generations IS 'Records each time a user generates/exports a report';
COMMENT ON COLUMN public.report_generations.user_id IS 'The user who generated the report';
COMMENT ON COLUMN public.report_generations.generated_at IS 'When the report was generated, used for monthly limits';
COMMENT ON COLUMN public.report_generations.export_type IS 'Format of the exported report (pdf, excel, etc.)';