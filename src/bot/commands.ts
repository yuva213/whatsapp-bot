import { WAMessage, WASocket } from '@whiskeysockets/baileys'
import { config } from '../config/env.js'
import { getSupabase } from '../database/supabase.js'
import { CloudflareAIService } from '../services/cloudflare-ai.js'

export interface CommandContext {
  sock: WASocket
  msg: WAMessage
  from: string
  sender: string
  pushName: string
  args: string[]
  command: string
  startTime: number
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>

const commands: Record<string, { handler: CommandHandler; description: string; usage: string }> = {}

export function registerCommand(
  name: string,
  description: string,
  usage: string,
  handler: CommandHandler
) {
  commands[name.toLowerCase()] = { handler, description, usage }
}

// 1. !ping
registerCommand('ping', 'Check bot responsiveness and latency', '!ping', async (ctx) => {
  const latency = Date.now() - ctx.startTime
  await ctx.sock.sendMessage(
    ctx.from,
    { text: `*Pong!* 🏓\n⏱️ Latency: *${latency}ms*` },
    { quoted: ctx.msg }
  )
})

// 2. !help
registerCommand('help', 'Display list of available commands', '!help', async (ctx) => {
  let message = `🤖 *${config.botName}* - Command Center\n\n`
  message += `Prefix: \`${config.commandPrefix}\`\n\n`

  for (const [cmd, details] of Object.entries(commands)) {
    message += `• *${config.commandPrefix}${cmd}*\n  _${details.description}_\n  Usage: \`${details.usage}\`\n\n`
  }

  message += `_Built with Baileys, Supabase & Cloudflare AI_`
  await ctx.sock.sendMessage(ctx.from, { text: message.trim() }, { quoted: ctx.msg })
})

// 3. !status
registerCommand('status', 'Show bot system and database status', '!status', async (ctx) => {
  const uptimeSeconds = Math.floor(process.uptime())
  const hours = Math.floor(uptimeSeconds / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const seconds = uptimeSeconds % 60
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

  const supabase = getSupabase()
  let dbStatus = '❌ Not Configured'
  if (supabase) {
    const { error } = await supabase.from('whatsapp_auth_creds').select('session_id').limit(1)
    dbStatus = error ? `⚠️ Error: ${error.message}` : '✅ Connected & Active'
  }

  const cfStatus = CloudflareAIService.isConfigured()
    ? '✅ Configured & Ready'
    : '⚠️ Missing API Token / Account ID'

  const text =
    `📊 *Bot System Status*\n\n` +
    `• *Bot Name:* ${config.botName}\n` +
    `• *Session ID:* ${config.sessionId}\n` +
    `• *Uptime:* ${uptimeStr}\n` +
    `• *Supabase Status:* ${dbStatus}\n` +
    `• *Cloudflare AI:* ${cfStatus}\n` +
    `• *Text Model:* \`${config.cloudflareTextModel}\`\n` +
    `• *Image Model:* \`${config.cloudflareImageModel}\`\n` +
    `• *Node.js:* ${process.version}\n` +
    `• *Memory Usage:* ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`

  await ctx.sock.sendMessage(ctx.from, { text }, { quoted: ctx.msg })
})

// 4. !echo <text>
registerCommand('echo', 'Echoes back your message', '!echo <text>', async (ctx) => {
  const text = ctx.args.join(' ')
  if (!text) {
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `⚠️ Please provide a message to echo: \`${config.commandPrefix}echo Hello world!\`` },
      { quoted: ctx.msg }
    )
    return
  }
  await ctx.sock.sendMessage(ctx.from, { text: `📢 ${text}` }, { quoted: ctx.msg })
})

// 5. !stats
registerCommand('stats', 'Show stored message and contact counts from Supabase', '!stats', async (ctx) => {
  const supabase = getSupabase()
  if (!supabase) {
    await ctx.sock.sendMessage(
      ctx.from,
      { text: '⚠️ Supabase is not configured yet. Database statistics unavailable.' },
      { quoted: ctx.msg }
    )
    return
  }

  try {
    const [msgRes, contactRes, chatRes] = await Promise.all([
      supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }),
      supabase.from('whatsapp_contacts').select('*', { count: 'exact', head: true }),
      supabase.from('whatsapp_chats').select('*', { count: 'exact', head: true })
    ])

    const text =
      `📈 *Supabase Database Statistics*\n\n` +
      `• *Logged Messages:* ${msgRes.count ?? 0}\n` +
      `• *Synced Contacts:* ${contactRes.count ?? 0}\n` +
      `• *Active Chats:* ${chatRes.count ?? 0}`

    await ctx.sock.sendMessage(ctx.from, { text }, { quoted: ctx.msg })
  } catch (err) {
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `❌ Failed to retrieve stats: ${(err as Error).message}` },
      { quoted: ctx.msg }
    )
  }
})

// 6. !poll <question> | <opt1> | <opt2>
registerCommand(
  'poll',
  'Create a WhatsApp poll',
  '!poll Question | Option 1 | Option 2',
  async (ctx) => {
    const raw = ctx.args.join(' ')
    const parts = raw.split('|').map((s) => s.trim()).filter(Boolean)

    if (parts.length < 3) {
      await ctx.sock.sendMessage(
        ctx.from,
        {
          text: `⚠️ Usage: \`${config.commandPrefix}poll What is your favorite framework? | React | Vue | Svelte\``
        },
        { quoted: ctx.msg }
      )
      return
    }

    const [question, ...options] = parts
    await ctx.sock.sendMessage(
      ctx.from,
      {
        poll: {
          name: question,
          values: options.slice(0, 12),
          selectableCount: 1
        }
      },
      { quoted: ctx.msg }
    )
  }
)

// 7. !ai / !ask <prompt> — Cloudflare Workers AI Text Generation
async function handleAIText(ctx: CommandContext) {
  const prompt = ctx.args.join(' ')
  if (!prompt) {
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `⚠️ Please provide a prompt:\n\`${config.commandPrefix}ai Explain quantum computing in simple words\`` },
      { quoted: ctx.msg }
    )
    return
  }

  try {
    // Send typing presence
    await ctx.sock.sendPresenceUpdate('composing', ctx.from)

    const response = await CloudflareAIService.generateText(prompt)

    const reply = `🤖 *AI Assistant* (${config.cloudflareTextModel.split('/').pop()}):\n\n${response}`
    await ctx.sock.sendMessage(ctx.from, { text: reply }, { quoted: ctx.msg })
  } catch (err) {
    console.error('[AI] Text generation error:', err)
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `❌ *Cloudflare AI Error:*\n${(err as Error).message}` },
      { quoted: ctx.msg }
    )
  }
}
registerCommand('ai', 'Generate text using Cloudflare Workers AI (Llama 3.1)', '!ai <prompt>', handleAIText)
registerCommand('ask', 'Ask AI a question', '!ask <question>', handleAIText)

// 8. !image / !draw / !imagine <prompt> — Cloudflare Workers AI Image Generation
async function handleAIImage(ctx: CommandContext) {
  const prompt = ctx.args.join(' ')
  if (!prompt) {
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `⚠️ Please provide an image prompt:\n\`${config.commandPrefix}image A cyberpunk futuristic city with neon lights at night\`` },
      { quoted: ctx.msg }
    )
    return
  }

  try {
    // Notify user that generation is in progress
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `🎨 *Generating image with Cloudflare AI...*\nPrompt: _"${prompt}"_\nPlease wait a few seconds.` },
      { quoted: ctx.msg }
    )

    // Call Cloudflare AI Image generation
    const imageBuffer = await CloudflareAIService.generateImage(prompt)

    // Send generated image
    await ctx.sock.sendMessage(
      ctx.from,
      {
        image: imageBuffer,
        caption: `🎨 *Cloudflare AI Image*\n📝 Prompt: _${prompt}_\n⚡ Model: \`${config.cloudflareImageModel.split('/').pop()}\``
      },
      { quoted: ctx.msg }
    )
  } catch (err) {
    console.error('[AI] Image generation error:', err)
    await ctx.sock.sendMessage(
      ctx.from,
      { text: `❌ *Image Generation Error:*\n${(err as Error).message}` },
      { quoted: ctx.msg }
    )
  }
}
registerCommand('image', 'Generate an image using Cloudflare Workers AI (SDXL / Flux)', '!image <prompt>', handleAIImage)
registerCommand('draw', 'Generate an image', '!draw <prompt>', handleAIImage)
registerCommand('imagine', 'Generate an image', '!imagine <prompt>', handleAIImage)

// 9. !models — View configured AI models
registerCommand('models', 'List active Cloudflare AI models', '!models', async (ctx) => {
  const text =
    `⚡ *Cloudflare Workers AI Models*\n\n` +
    `• *Text Model:* \`${config.cloudflareTextModel}\`\n` +
    `  _Free, high-speed Llama 3.1 8B Instruct_\n\n` +
    `• *Image Model:* \`${config.cloudflareImageModel}\`\n` +
    `  _Free, photorealistic Stable Diffusion XL_\n\n` +
    `• *Worker URL:* ${config.cloudflareWorkerUrl || 'Direct REST API'}\n` +
    `• *Account Configured:* ${config.cloudflareAccountId ? 'Yes' : 'No'}`

  await ctx.sock.sendMessage(ctx.from, { text }, { quoted: ctx.msg })
})

// 10. !info
registerCommand('info', 'Show sender & chat info', '!info', async (ctx) => {
  const text =
    `👤 *Your Profile Info*\n\n` +
    `• *Push Name:* ${ctx.pushName || 'N/A'}\n` +
    `• *Sender JID:* ${ctx.sender}\n` +
    `• *Chat JID:* ${ctx.from}\n` +
    `• *Is Group:* ${ctx.from.endsWith('@g.us') ? 'Yes' : 'No'}`

  await ctx.sock.sendMessage(ctx.from, { text }, { quoted: ctx.msg })
})

export async function handleCommand(
  sock: WASocket,
  msg: WAMessage,
  text: string
): Promise<boolean> {
  const prefix = config.commandPrefix
  if (!text.startsWith(prefix)) return false

  const parts = text.slice(prefix.length).trim().split(/\s+/)
  const commandName = parts[0]?.toLowerCase()
  const args = parts.slice(1)

  if (!commandName) return false

  const cmd = commands[commandName]
  if (!cmd) return false

  if (!msg.key || !msg.key.remoteJid) return false

  const from = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
  const pushName = msg.pushName || 'User'

  const ctx: CommandContext = {
    sock,
    msg,
    from,
    sender,
    pushName,
    args,
    command: commandName,
    startTime: Date.now()
  }

  try {
    await cmd.handler(ctx)
    return true
  } catch (err) {
    console.error(`[Command] Error running command ${commandName}:`, err)
    await sock.sendMessage(
      from,
      { text: `❌ An error occurred executing *${prefix}${commandName}*: ${(err as Error).message}` },
      { quoted: ctx.msg }
    )
    return true
  }
}
