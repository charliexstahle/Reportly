import { createClient } from '@supabase/supabase-js';
import { Database } from '../types_db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Function to fetch the user's current usage and limits
export async function getUserUsageInfo(userId: string) {
  // Get the user's plan limits
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('monthly_report_limit, storage_limit_mb, plan_tier, is_subscription_active')
    .eq('user_id', userId)
    .single();

  if (settingsError || !userSettings) {
    console.error('Error fetching user settings:', settingsError);
    return {
      reports: { currentUsage: 0, limit: 0, isUnlimited: false, percentUsed: 0 },
      storage: { currentUsage: 0, limit: 0, isUnlimited: false, percentUsed: 0 },
      planTier: 'free',
      isActive: true
    };
  }

  // Get the user's current month report count
  const { count: reportsCount, error: reportsError } = await supabase
    .from('report_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('generated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  if (reportsError) {
    console.error('Error fetching report usage:', reportsError);
    return {
      reports: { currentUsage: 0, limit: 0, isUnlimited: false, percentUsed: 0 },
      storage: { currentUsage: 0, limit: 0, isUnlimited: false, percentUsed: 0 },
      planTier: userSettings.plan_tier,
      isActive: userSettings.is_subscription_active
    };
  }

  // Calculate storage usage (this could be more complex in a real app)
  // For now, just estimated based on reports generated
  const { data: storageData, error: storageError } = await supabase
    .from('report_generations')
    .select('file_size_kb')
    .eq('user_id', userId);
  
  const storageUsageKb = storageError || !storageData 
    ? 0 
    : storageData.reduce((acc, item) => acc + (item.file_size_kb || 0), 0);
  const storageUsageMb = storageUsageKb / 1024;

  // Return usage information
  const reportLimit = userSettings.monthly_report_limit;
  const storageLimit = userSettings.storage_limit_mb;

  return {
    reports: {
      currentUsage: reportsCount || 0,
      limit: reportLimit,
      isUnlimited: reportLimit === null,
      percentUsed: reportLimit ? Math.round((reportsCount || 0) / reportLimit * 100) : null
    },
    storage: {
      currentUsage: Math.round(storageUsageMb),
      limit: storageLimit,
      isUnlimited: storageLimit === null,
      percentUsed: storageLimit ? Math.round(storageUsageMb / storageLimit * 100) : null
    },
    planTier: userSettings.plan_tier,
    isActive: userSettings.is_subscription_active ?? true
  };
}

// Helper function to check if a user can generate more reports
export async function canGenerateReport(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_generate_report', {
    p_user_id: userId
  });

  return error ? false : !!data;
}
