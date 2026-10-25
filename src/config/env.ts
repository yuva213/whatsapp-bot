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

  // Cloudflare Workers AI
  cloudflareAccountId?: string
  cloudflareApiToken?: string
  cloudflareTextModel: string
  cloudflareImageModel: string
  cloudflareWorkerUrl?: string
}

export const config: Config = {
  botName: process.env.BOT_NAME || 'KotlerX WhatsApp Bot',
  sessionId: process.env.SESSION_ID || 'default_session',
  usePairingCode: process.env.USE_PAIRING_CODE === 'true',
  phoneNumber: process.env.PHONE_NUMBER?.replace(/\D/g, '') || '',
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    undefined,
  commandPrefix: process.env.COMMAND_PREFIX || '!',
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  syncFullHistory: process.env.SYNC_FULL_HISTORY === 'true',

  // Cloudflare Workers AI
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || undefined,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || undefined,
  cloudflareTextModel:
    process.env.CLOUDFLARE_TEXT_MODEL || '@cf/meta/llama-3.1-8b-instruct',
  cloudflareImageModel:
    process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  cloudflareWorkerUrl: process.env.CLOUDFLARE_WORKER_URL || undefined
}
