import { supabase } from '@/utils/supabase'

/**
 * Fetch settings for current user.
 * Returns null if no settings row exists yet.
 * @returns {{ std_hours, period_start_day, period_end_day } | null}
 */
export async function fetchSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('std_hours, period_start_day, period_end_day')
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Upsert settings for current user.
 * @param {{ std_hours?, period_start_day?, period_end_day? }} patch
 */
export async function upsertSettings(patch) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
