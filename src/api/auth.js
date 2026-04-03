import { supabase } from '@/utils/supabase'

/**
 * Sign in with email and password.
 * @returns {{ user: object, session: object }}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * Register a new account.
 * Creates auth user and writes nickname to public.profiles.
 * @returns {{ user: object }}
 */
export async function signUp(email, password, nickname) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, nickname })
    if (profileError) throw profileError
  }
  return data
}

/** Sign out current user. */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Get current session user (null if not logged in). */
export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

/** Fetch profile (nickname) for current user. */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error  // ignore "not found"
  return data
}
