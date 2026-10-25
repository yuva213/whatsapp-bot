import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  SignalDataTypeMap,
  SignalDataSet,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { getSupabase, isSupabaseWriteAvailable } from './supabase.js'

export interface SupabaseAuthStateResult {
  state: AuthenticationState
  saveCreds: () => Promise<void>
  isUsingDatabase: boolean
}

export async function useSupabaseAuthState(
  sessionId: string = 'default_session'
): Promise<SupabaseAuthStateResult> {
  const supabase = getSupabase()
  const canWrite = await isSupabaseWriteAvailable()

  if (!supabase || !canWrite) {
    console.log(
      `📁 [AuthStore] Using fast local file session storage: auth_info_${sessionId}`
    )
    const fileAuth = await useMultiFileAuthState(`auth_info_${sessionId}`)
    return {
      state: fileAuth.state,
      saveCreds: fileAuth.saveCreds,
      isUsingDatabase: false
    }
  }

  console.log(`[AuthStore] Initializing Supabase-backed authentication for session: "${sessionId}"`)

  // 1. Load or initialize credentials
  let creds: AuthenticationCreds
  try {
    const { data, error } = await supabase
      .from('whatsapp_auth_creds')
      .select('creds')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('[AuthStore] Error reading credentials from Supabase:', error)
      throw error
    }

    if (data && data.creds) {
      const credsString = typeof data.creds === 'string' ? data.creds : JSON.stringify(data.creds)
      creds = JSON.parse(credsString, BufferJSON.reviver)
      console.log('[AuthStore] Existing credentials loaded from Supabase')
    } else {
      creds = initAuthCreds()
      const serialized = JSON.stringify(creds, BufferJSON.replacer)
      await supabase.from('whatsapp_auth_creds').upsert({
        session_id: sessionId,
        creds: JSON.parse(serialized),
        updated_at: new Date().toISOString()
      })
      console.log('[AuthStore] New credentials generated and persisted to Supabase')
    }
  } catch (err) {
    console.error('[AuthStore] Error loading creds from database, using initAuthCreds:', err)
    creds = initAuthCreds()
  }

  // 2. Define SignalKeyStore implementation
  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {}
      if (ids.length === 0) return result

      try {
        const { data, error } = await supabase
          .from('whatsapp_auth_keys')
          .select('key_id, key_value')
          .eq('session_id', sessionId)
          .eq('key_type', type)
          .in('key_id', ids)

        if (error) {
          console.error(`[AuthStore] Error getting keys for type ${type}:`, error)
          return result
        }

        if (data) {
          for (const row of data) {
            const rawVal = typeof row.key_value === 'string' ? row.key_value : JSON.stringify(row.key_value)
            const parsed = JSON.parse(rawVal, BufferJSON.reviver)
            result[row.key_id] = parsed
          }
        }
      } catch (err) {
        console.error(`[AuthStore] Unexpected error fetching keys (${type}):`, err)
      }

      return result
    },

    set: async (data: SignalDataSet): Promise<void> => {
      const upserts: Array<{
        session_id: string
        key_type: string
        key_id: string
        key_value: any
        updated_at: string
      }> = []
      const deletes: Array<{ type: string; id: string }> = []

      for (const category of Object.keys(data)) {
        const type = category as keyof SignalDataTypeMap
        const items = data[type]
        if (!items) continue

        for (const id of Object.keys(items)) {
          const value = items[id]
          if (value === null || value === undefined) {
            deletes.push({ type, id })
          } else {
            const serialized = JSON.stringify(value, BufferJSON.replacer)
            upserts.push({
              session_id: sessionId,
              key_type: type,
              key_id: id,
              key_value: JSON.parse(serialized),
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      try {
        if (upserts.length > 0) {
          const { error } = await supabase.from('whatsapp_auth_keys').upsert(upserts, {
            onConflict: 'session_id,key_type,key_id'
          })
          if (error) {
            console.error('[AuthStore] Failed to upsert keys to Supabase:', error)
          }
        }

        for (const del of deletes) {
          await supabase
            .from('whatsapp_auth_keys')
            .delete()
            .eq('session_id', sessionId)
            .eq('key_type', del.type)
            .eq('key_id', del.id)
        }
      } catch (err) {
        console.error('[AuthStore] Error executing set operation:', err)
      }
    },

    clear: async (): Promise<void> => {
      try {
        await supabase.from('whatsapp_auth_keys').delete().eq('session_id', sessionId)
        await supabase.from('whatsapp_auth_creds').delete().eq('session_id', sessionId)
        console.log(`[AuthStore] Cleared all auth keys and credentials for session ${sessionId}`)
      } catch (err) {
        console.error('[AuthStore] Error clearing session:', err)
      }
    }
  }

  // 3. Save credentials callback
  const saveCreds = async () => {
    try {
      const serialized = JSON.stringify(creds, BufferJSON.replacer)
      const { error } = await supabase.from('whatsapp_auth_creds').upsert({
        session_id: sessionId,
        creds: JSON.parse(serialized),
        updated_at: new Date().toISOString()
      })
      if (error) {
        console.error('[AuthStore] Failed to save credentials to Supabase:', error)
      }
    } catch (err) {
      console.error('[AuthStore] Error in saveCreds:', err)
    }
  }

  return {
    state: {
      creds,
      keys
    },
    saveCreds,
    isUsingDatabase: true
  }
}
