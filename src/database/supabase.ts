import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

let supabaseClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient
  }

  if (config.supabaseUrl && config.supabaseKey) {
    try {
      supabaseClient = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
      return supabaseClient
    } catch (err) {
      console.error('[Supabase] Failed to initialize client:', err)
      return null
    }
  }

  return null
}

export async function isSupabaseAvailable(): Promise<boolean> {
  const client = getSupabase()
  if (!client) return false

  try {
    const { error } = await client.from('whatsapp_auth_creds').select('session_id').limit(1)
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet or connection failed
      console.warn('[Supabase] Connection test returned error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] Connection failed:', (err as Error).message)
    return false
  }
}
