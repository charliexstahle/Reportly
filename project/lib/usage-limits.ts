import { supabase } from './supabaseClient';

/**
 * Records a report generation event in the database
 * @param userId The ID of the user who generated the report
 * @param reportId Optional ID of the report that was generated
 * @param exportType The type of export (pdf, excel, csv, etc.)
 * @param details Additional details about the export
 * @returns Promise resolving to success status
 */
export async function recordReportGeneration(
  userId: string,
  reportId: string | null = null,
  exportType: string,
  details: {
    fileName?: string;
    fileSize?: number;
    templateId?: string;
    duration?: number;
    isScheduled?: boolean;
  } = {}
): Promise<{ success: boolean; error?: any }> {
  try {
    // Check if user has reached their generation limit
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Get monthly report count
    const { data: usageCount, error: usageError } = await supabase
      .rpc('get_monthly_report_generations', { p_user_id: userId });
    
    if (usageError) {
      console.error('Error fetching usage count:', usageError);
      return { success: false, error: usageError };
    }
    
    // Get user settings to check plan
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('current_plan')
      .eq('user_id', userId)
      .single();
    
    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      // We'll still allow the operation but log the error
    }
    
    // Check if user has reached their monthly limit
    const isFreeTier = !settings || settings.current_plan === 'free';
    const monthlyLimit = isFreeTier ? 10 : Infinity;
    
    if (isFreeTier && usageCount >= monthlyLimit) {
      return { 
        success: false, 
        error: 'Monthly report generation limit reached. Please upgrade to generate more reports.' 
      };
    }
    
    // Record the report generation
    const { error: insertError } = await supabase
      .from('report_generations')
      .insert({
        user_id: userId,
        report_id: reportId,
        export_type: exportType,
        file_name: details.fileName,
        file_size_kb: details.fileSize,
        template_id: details.templateId,
        generation_duration_ms: details.duration,
        is_scheduled: details.isScheduled || false,
      });
    
    if (insertError) {
      console.error('Error recording report generation:', insertError);
      return { success: false, error: insertError };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in recordReportGeneration:', error);
    return { success: false, error };
  }
}

/**
 * Check if a user has reached their monthly report generation limit
 * @param userId The ID of the user to check
 * @returns Promise resolving to an object with limit information
 */
export async function checkReportGenerationLimit(
  userId: string
): Promise<{
  hasReachedLimit: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  error?: any;
}> {
  try {
    // Get user plan
    const { data: settings } = await supabase
      .from('user_settings')
      .select('current_plan')
      .eq('user_id', userId)
      .single();
    
    const isFreeTier = !settings || settings.current_plan === 'free';
    const limit = isFreeTier ? 10 : Infinity;
    
    // Get current count
    const { data: usageCount, error } = await supabase
      .rpc('get_monthly_report_generations', { p_user_id: userId });
    
    if (error) {
      console.error('Error checking generation limit:', error);
      return {
        hasReachedLimit: false, // Allow export if we can't check
        currentCount: 0,
        limit: limit,
        remaining: limit,
        error
      };
    }
    
    const count = usageCount || 0;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - count);
    
    return {
      hasReachedLimit: isFreeTier && count >= limit,
      currentCount: count,
      limit: limit,
      remaining: remaining
    };
  } catch (error) {
    console.error('Unexpected error in checkReportGenerationLimit:', error);
    return {
      hasReachedLimit: false, // Allow export if we can't check
      currentCount: 0,
      limit: 10,
      remaining: 10,
      error
    };
  }
}

/**
 * Get script usage and limits for the current user
 * @param userId The ID of the user to check
 * @returns Promise resolving to script usage information
 */
export async function getScriptUsage(
  userId: string
): Promise<{
  hasReachedLimit: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  error?: any;
}> {
  try {
    // Get user plan
    const { data: settings } = await supabase
      .from('user_settings')
      .select('current_plan')
      .eq('user_id', userId)
      .single();
    
    const isFreeTier = !settings || settings.current_plan === 'free';
    const limit = isFreeTier ? 5 : Infinity;
    
    // Get script count
    const { count, error } = await supabase
      .from('script_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error checking script usage:', error);
      return {
        hasReachedLimit: false,
        currentCount: 0,
        limit: limit,
        remaining: limit,
        error
      };
    }
    
    const scriptCount = count || 0;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - scriptCount);
    
    return {
      hasReachedLimit: isFreeTier && scriptCount >= limit,
      currentCount: scriptCount,
      limit: limit,
      remaining: remaining
    };
  } catch (error) {
    console.error('Unexpected error in getScriptUsage:', error);
    return {
      hasReachedLimit: false,
      currentCount: 0,
      limit: 5,
      remaining: 5,
      error
    };
  }
}