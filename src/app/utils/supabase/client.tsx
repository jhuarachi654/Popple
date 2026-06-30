import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './info'

// Create a singleton Supabase client
let supabaseInstance: any = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    )
  }
  return supabaseInstance
}

// Legacy function for backwards compatibility
export const createClient = (supabaseUrl: string, supabaseAnonKey: string) => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}