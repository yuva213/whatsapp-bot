import { Contact } from '@whiskeysockets/baileys'
import { getSupabase } from './supabase.js'

export async function upsertContacts(contacts: Contact[]): Promise<void> {
  if (!contacts || contacts.length === 0) return

  const supabase = getSupabase()
  if (!supabase) return

  const records = contacts
    .filter((c) => !!c.id)
    .map((c) => {
      // Extract phone number from JID (e.g. 1234567890@s.whatsapp.net -> 1234567890)
      const phone = c.id.includes('@') ? c.id.split('@')[0] : c.id

      return {
        id: c.id,
        phone_number: phone,
        name: c.name || null,
        notify_name: c.notify || null,
        verified_name: c.verifiedName || null,
        profile_pic_url: c.imgUrl || null,
        metadata: {
          status: (c as any).status || null
        },
        updated_at: new Date().toISOString()
      }
    })

  if (records.length === 0) return

  // Batch insert in chunks of 100 to prevent oversized requests
  const chunkSize = 100
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize)
    try {
      const { error } = await supabase.from('whatsapp_contacts').upsert(chunk, {
        onConflict: 'id'
      })
      if (error) {
        console.error('[ContactStore] Error upserting contacts batch:', error.message)
      }
    } catch (err) {
      console.error('[ContactStore] Unexpected error in upsertContacts batch:', err)
    }
  }
}

export async function updateContactProfilePic(id: string, imgUrl: string | null): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    await supabase
      .from('whatsapp_contacts')
      .update({ profile_pic_url: imgUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
  } catch (err) {
    console.error(`[ContactStore] Error updating profile picture for ${id}:`, err)
  }
}
