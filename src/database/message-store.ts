import {
  getContentType,
  proto,
  WAMessage,
  WAMessageKey
} from '@whiskeysockets/baileys'
import { getSupabase } from './supabase.js'

// In-memory cache for recent messages to satisfy getMessage quickly
const memoryStore = new Map<string, proto.IMessage>()
const MAX_MEMORY_MESSAGES = 1000

function makeKey(jid: string, id: string): string {
  return `${jid}:${id}`
}

export function extractMessageContent(message?: proto.IMessage | null): {
  type: string
  content: string
  mediaUrl?: string
} {
  if (!message) return { type: 'unknown', content: '' }

  const contentType = getContentType(message)
  if (!contentType) return { type: 'unknown', content: '' }

  switch (contentType) {
    case 'conversation':
      return { type: 'text', content: message.conversation || '' }
    case 'extendedTextMessage':
      return { type: 'text', content: message.extendedTextMessage?.text || '' }
    case 'imageMessage':
      return {
        type: 'image',
        content: message.imageMessage?.caption || '',
        mediaUrl: message.imageMessage?.url || undefined
      }
    case 'videoMessage':
      return {
        type: 'video',
        content: message.videoMessage?.caption || '',
        mediaUrl: message.videoMessage?.url || undefined
      }
    case 'audioMessage':
      return {
        type: 'audio',
        content: '[Audio Message]',
        mediaUrl: message.audioMessage?.url || undefined
      }
    case 'documentMessage':
      return {
        type: 'document',
        content: message.documentMessage?.fileName || message.documentMessage?.caption || '[Document]',
        mediaUrl: message.documentMessage?.url || undefined
      }
    case 'stickerMessage':
      return {
        type: 'sticker',
        content: '[Sticker]',
        mediaUrl: message.stickerMessage?.url || undefined
      }
    case 'reactionMessage':
      return {
        type: 'reaction',
        content: message.reactionMessage?.text || ''
      }
    case 'pollCreationMessage':
    case 'pollCreationMessageV2':
    case 'pollCreationMessageV3': {
      const poll =
        message.pollCreationMessage ||
        message.pollCreationMessageV2 ||
        message.pollCreationMessageV3
      const name = poll?.name || 'Poll'
      const options = poll?.options?.map((o) => o.optionName).join(', ') || ''
      return {
        type: 'poll',
        content: `${name} (Options: ${options})`
      }
    }
    default:
      return { type: contentType, content: `[${contentType}]` }
  }
}

export async function saveMessage(msg: WAMessage): Promise<void> {
  if (!msg.key.remoteJid || !msg.key.id) return

  // Cache in memory
  const storeKey = makeKey(msg.key.remoteJid, msg.key.id)
  if (msg.message) {
    if (memoryStore.size >= MAX_MEMORY_MESSAGES) {
      const oldestKey = memoryStore.keys().next().value
      if (oldestKey) memoryStore.delete(oldestKey)
    }
    memoryStore.set(storeKey, msg.message)
  }

  // Persist to Supabase
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { type, content, mediaUrl } = extractMessageContent(msg.message)

    // Parse timestamp (seconds to milliseconds Date)
    let timestampIso: string
    if (typeof msg.messageTimestamp === 'number') {
      timestampIso = new Date(msg.messageTimestamp * 1000).toISOString()
    } else if (msg.messageTimestamp && typeof (msg.messageTimestamp as any).toNumber === 'function') {
      timestampIso = new Date((msg.messageTimestamp as any).toNumber() * 1000).toISOString()
    } else {
      timestampIso = new Date().toISOString()
    }

    const senderId = msg.key.participant || msg.key.remoteJid

    const record = {
      id: msg.key.id,
      chat_id: msg.key.remoteJid,
      sender_id: senderId,
      from_me: !!msg.key.fromMe,
      push_name: msg.pushName || null,
      message_type: type,
      content,
      media_url: mediaUrl || null,
      status: msg.key.fromMe ? 'sent' : 'received',
      raw_payload: msg.message ? JSON.parse(JSON.stringify(msg.message)) : null,
      timestamp: timestampIso
    }

    const { error } = await supabase.from('whatsapp_messages').upsert(record, {
      onConflict: 'chat_id,id'
    })

    if (error) {
      console.error('[MessageStore] Error inserting message into Supabase:', error.message)
    }
  } catch (err) {
    console.error('[MessageStore] Unexpected error saving message:', err)
  }
}

export async function updateMessageStatus(
  key: WAMessageKey,
  status: proto.WebMessageInfo.Status | number | string
): Promise<void> {
  if (!key.remoteJid || !key.id) return

  const supabase = getSupabase()
  if (!supabase) return

  let statusText = 'unknown'
  if (typeof status === 'number') {
    switch (status) {
      case 1:
        statusText = 'sent'
        break
      case 2:
        statusText = 'delivered'
        break
      case 3:
        statusText = 'read'
        break
      case 4:
        statusText = 'played'
        break
      default:
        statusText = `status_${status}`
    }
  } else if (typeof status === 'string') {
    statusText = status
  }

  try {
    await supabase
      .from('whatsapp_messages')
      .update({ status: statusText })
      .eq('chat_id', key.remoteJid)
      .eq('id', key.id)
  } catch (err) {
    console.error('[MessageStore] Error updating message status:', err)
  }
}

export async function getMessage(key: WAMessageKey): Promise<proto.IMessage | undefined> {
  if (!key.remoteJid || !key.id) return undefined

  // 1. Check in-memory store
  const storeKey = makeKey(key.remoteJid, key.id)
  if (memoryStore.has(storeKey)) {
    return memoryStore.get(storeKey)
  }

  // 2. Query Supabase
  const supabase = getSupabase()
  if (!supabase) return undefined

  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('raw_payload')
      .eq('chat_id', key.remoteJid)
      .eq('id', key.id)
      .maybeSingle()

    if (error || !data || !data.raw_payload) return undefined

    const msgProto = proto.Message.fromObject(data.raw_payload)
    memoryStore.set(storeKey, msgProto)
    return msgProto
  } catch (err) {
    console.error('[MessageStore] Error fetching message for getMessage:', err)
    return undefined
  }
}
