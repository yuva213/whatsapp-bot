import { Chat } from '@whiskeysockets/baileys'
import { getSupabase } from './supabase.js'

export async function upsertChats(chats: Chat[]): Promise<void> {
  if (!chats || chats.length === 0) return

  const supabase = getSupabase()
  if (!supabase) return

  const records = chats
    .filter((c): c is Chat & { id: string } => typeof c.id === 'string' && c.id.length > 0)
    .map((c) => {
      let lastMessageIso: string | null = null
      if (c.conversationTimestamp) {
        const ts =
          typeof c.conversationTimestamp === 'number'
            ? c.conversationTimestamp
            : (c.conversationTimestamp as any).toNumber?.() || Number(c.conversationTimestamp)
        if (ts) {
          lastMessageIso = new Date(ts * 1000).toISOString()
        }
      }

      const isGroup = typeof c.id === 'string' ? c.id.endsWith('@g.us') : false

      return {
        id: c.id,
        name: c.name || (c as any).subject || null,
        is_group: isGroup,
        unread_count: c.unreadCount || 0,
        last_message_at: lastMessageIso,
        metadata: {
          archived: c.archived || false,
          pinned: c.pinned || false,
          muteEndTime: c.muteEndTime || null
        },
        updated_at: new Date().toISOString()
      }
    })

  if (records.length === 0) return

  const chunkSize = 100
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize)
    try {
      const { error } = await supabase.from('whatsapp_chats').upsert(chunk, {
        onConflict: 'id'
      })
      if (error) {
        console.error('[ChatStore] Error upserting chats batch:', error.message)
      }
    } catch (err) {
      console.error('[ChatStore] Unexpected error in upsertChats batch:', err)
    }
  }
}

export async function deleteChats(chatIds: string[]): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || chatIds.length === 0) return

  try {
    await supabase.from('whatsapp_chats').delete().in('id', chatIds)
  } catch (err) {
    console.error('[ChatStore] Error deleting chats:', err)
  }
}
