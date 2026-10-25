import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessage
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { config } from './config/env.js'
import { useSupabaseAuthState } from './database/auth-store.js'
import { deleteChats, upsertChats } from './database/chat-store.js'
import { updateContactProfilePic, upsertContacts } from './database/contact-store.js'
import {
  extractMessageContent,
  getMessage,
  saveMessage,
  updateMessageStatus
} from './database/message-store.js'
import { isSupabaseAvailable } from './database/supabase.js'
import { handleCommand } from './bot/commands.js'
import { handleConnectionUpdate } from './handlers/connection.js'

const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss'
    }
  }
})

let isReconnecting = false

async function startWhatsAppBot() {
  console.log(`\n======================================================`)
  console.log(`🚀 Starting ${config.botName}...`)
  console.log(`======================================================`)

  // 1. Check Supabase Status
  const supabaseConnected = await isSupabaseAvailable()
  if (supabaseConnected) {
    console.log('✅ Supabase: Connected and verified')
  } else {
    console.warn(
      '⚠️  Supabase: Not configured or tables not found yet. Using local file storage for session.'
    )
    console.warn(
      '👉 Tip: Run supabase/migrations/001_whatsapp_bot_init.sql in your Supabase SQL Editor.'
    )
  }

  // 2. Auth State Initialization
  const { state, saveCreds, isUsingDatabase } = await useSupabaseAuthState(config.sessionId)
  console.log(`🔐 Storage Engine: ${isUsingDatabase ? 'Supabase Database' : 'Local File Store'}`)

  // 3. Fetch latest WhatsApp Web version
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`📦 WhatsApp Web Version: v${version.join('.')} (Latest: ${isLatest})`)

  // 4. Create Socket
  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    getMessage,
    syncFullHistory: config.syncFullHistory,
    generateHighQualityLinkPreview: true,
    browser: [config.botName, 'Chrome', '1.0.0']
  })

  // 5. Unified Event Processing
  sock.ev.process(async (events) => {
    // ── Connection Updates ──────────────────────────────────────
    if (events['connection.update']) {
      const update = events['connection.update']
      const { shouldReconnect } = await handleConnectionUpdate(update, sock)

      if (shouldReconnect && !isReconnecting) {
        isReconnecting = true
        console.log('[Bot] Reconnecting in 3 seconds...')
        setTimeout(() => {
          isReconnecting = false
          startWhatsAppBot()
        }, 3000)
      }
    }

    // ── Credentials Persistence ─────────────────────────────────
    if (events['creds.update']) {
      await saveCreds()
    }

    // ── Initial History Synchronization ─────────────────────────
    if (events['messaging-history.set']) {
      const { chats, contacts, messages, isLatest } = events['messaging-history.set']
      console.log(
        `[History] Sync received: ${chats.length} chats, ${contacts.length} contacts, ${messages.length} messages (latest: ${isLatest})`
      )

      if (contacts && contacts.length > 0) {
        await upsertContacts(contacts)
      }
      if (chats && chats.length > 0) {
        await upsertChats(chats)
      }
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          await saveMessage(msg)
        }
      }
    }

    // ── Real-Time Incoming & Outgoing Messages ───────────────────
    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert']

      for (const msg of messages) {
        // Save to message store
        await saveMessage(msg)

        // Only process live commands
        if (type === 'notify' && !msg.key.fromMe) {
          const { content } = extractMessageContent(msg.message)
          if (content) {
            await handleCommand(sock, msg, content)
          }
        }
      }
    }

    // ── Message Status Updates (Delivery / Read Receipts) ───────
    if (events['messages.update']) {
      for (const { key, update } of events['messages.update']) {
        if (update.status) {
          await updateMessageStatus(key, update.status)
        }
      }
    }

    // ── Contacts Upsert & Profile Updates ───────────────────────
    if (events['contacts.upsert']) {
      await upsertContacts(events['contacts.upsert'])
    }

    if (events['contacts.update']) {
      for (const contact of events['contacts.update']) {
        if (typeof contact.imgUrl !== 'undefined' && contact.id) {
          const url = contact.imgUrl ? await sock.profilePictureUrl(contact.id).catch(() => null) : null
          await updateContactProfilePic(contact.id, url ?? null)
        }
      }
    }

    // ── Chats Lifecycle ─────────────────────────────────────────
    if (events['chats.upsert']) {
      await upsertChats(events['chats.upsert'])
    }

    if (events['chats.update']) {
      await upsertChats(events['chats.update'] as any)
    }

    if (events['chats.delete']) {
      await deleteChats(events['chats.delete'])
    }
  })

  return sock
}

// Global Process Termination Handlers
process.on('SIGINT', () => {
  console.log('\n[Process] Gracefully shutting down WhatsApp bot...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[Process] Gracefully shutting down WhatsApp bot...')
  process.exit(0)
})

startWhatsAppBot().catch((err) => {
  console.error('[Bot] Fatal error starting WhatsApp bot:', err)
})
