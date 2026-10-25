import dotenv from 'dotenv'

dotenv.config()

export interface Config {
  botName: string
  sessionId: string
  usePairingCode: boolean
  phoneNumber: string
  supabaseUrl?: string
  supabaseKey?: string
  commandPrefix: string
  logLevel: 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error'
  syncFullHistory: boolean
}

export const config: Config = {
  botName: process.env.BOT_NAME || 'KotlerX WhatsApp Bot',
  sessionId: process.env.SESSION_ID || 'default_session',
  usePairingCode: process.env.USE_PAIRING_CODE === 'true',
  phoneNumber: process.env.PHONE_NUMBER?.replace(/\D/g, '') || '',
  supabaseUrl: process.env.SUPABASE_URL || undefined,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || undefined,
  commandPrefix: process.env.COMMAND_PREFIX || '!',
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  syncFullHistory: process.env.SYNC_FULL_HISTORY === 'true'
}
