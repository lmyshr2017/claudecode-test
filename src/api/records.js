import { supabase } from '@/utils/supabase'

/**
 * Fetch all records between start and end date (inclusive).
 * @param {string} start - YYYY-MM-DD
 * @param {string} end   - YYYY-MM-DD
 * @returns {Array<RecordRow>}
 */
export async function fetchRecords(start, end) {
  const { data, error } = await supabase
    .from('records')
    .select('id, date, start_time, end_time, ot_hours, note')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Upsert (insert or update) a single record.
 * Same user + same date → update; otherwise → insert.
 * @param {{ date, start_time, end_time, ot_hours, note }} record
 * @returns {RecordRow}
 */
export async function upsertRecord(record) {
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('records')
    .upsert({ ...record, user_id: userId }, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Delete a record by date.
 * @param {string} date - YYYY-MM-DD
 */
export async function deleteRecord(date) {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('date', date)
  if (error) throw error
}
