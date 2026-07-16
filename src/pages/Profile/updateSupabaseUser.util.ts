import type { User, UserAttributes } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'

export async function updateSupabaseUser(attributes: UserAttributes): Promise<User> {
  const { data, error } = await supabase.auth.updateUser(attributes)
  if (error) throw error
  if (!data.user) throw new Error('Supabase returned no user after the profile update.')

  if (!attributes.data) return data.user

  const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) throw refreshError

  return refreshedData.user ?? data.user
}
