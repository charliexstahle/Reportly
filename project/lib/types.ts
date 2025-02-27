export type Script = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  sql_script: string;
  categories: string[];
  tags: string[];
  version: string | null;
  created_at: string;
  updated_at: string;
};

export interface UserSettings {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  dark_mode: boolean;
  email_reports: boolean;
  product_updates: boolean;
  security_alerts: boolean;
  two_factor_authentication: boolean;
  current_plan: string;
  payment_methods: Record<string, any>;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  // New subscription-related fields
  subscription_id?: string | null;
  plan_tier?: string; // 'free', 'professional', 'enterprise'
  monthly_report_limit?: number | null; // null means unlimited
  storage_limit_mb?: number | null; // null means unlimited
  subscription_starts_at?: string | null;
  subscription_ends_at?: string | null;
  is_subscription_active?: boolean;
}

export type Template = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  design_content: any;
  created_at: string;
  updated_at: string;
};

// New types for subscription features
export interface PlanFeature {
  plan_tier: string;
  monthly_price_usd: number;
  features: string[];
  description: string;
  is_published: boolean;
}

export interface ReportGeneration {
  id: string;
  user_id: string;
  report_id?: string;
  generated_at: string;
  export_type: string;
  export_success: boolean;
  file_size_kb?: number;
  file_name?: string;
  template_id?: string;
  generation_duration_ms?: number;
  is_scheduled: boolean;
}

export interface UsageInfo {
  currentUsage: number;
  limit: number | null; // null means unlimited
  isUnlimited: boolean;
  percentUsed: number | null; // null if unlimited
}
