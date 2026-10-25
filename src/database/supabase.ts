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
      return false
    }
    return true
  } catch (err) {
    return false
  }
}

export async function isSupabaseWriteAvailable(): Promise<boolean> {
  const client = getSupabase()
  if (!client) return false

  try {
    const testId = '__test_write_check__'
    const { error } = await client
      .from('whatsapp_auth_creds')
      .upsert({ session_id: testId, creds: { test: true } })

    if (error) {
      if (error.code === '42501') {
        console.warn(
          '⚠️  [Supabase RLS Warning] Database write blocked by Row Level Security (RLS).'
        )
        console.warn(
          '👉 Add SUPABASE_SERVICE_ROLE_KEY in .env OR run supabase/migrations/002_allow_rls_access.sql in Supabase SQL editor.'
        )
      }
      return false
    }

    // Clean up test row
    await client.from('whatsapp_auth_creds').delete().eq('session_id', testId)
    return true
  } catch {
    return false
  }
}
