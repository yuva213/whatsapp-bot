# KotlerX WhatsApp Bot (Baileys + Supabase)

A high-performance WhatsApp bot built using [Baileys](https://baileys.wiki) and integrated with [Supabase](https://supabase.com) for production session persistence, full message logging, and contact synchronization.

---

## ✨ Features

- **Direct WebSocket Protocol**: Connects to WhatsApp Web API directly over WebSockets with zero browser/Chromium/Selenium overhead.
- **Supabase-Backed Authentication**: Signal Protocol keys and auth credentials are automatically serialized with `BufferJSON` and stored in Supabase PostgreSQL tables.
- **Graceful Fallback**: If Supabase credentials are not provided or connection fails, automatically falls back to local file-based storage (`auth_info_*`) without crashing.
- **QR Code & Pairing Code Modes**: Supports both terminal QR code scanning (`qrcode-terminal`) and 8-digit pairing code generation for headless servers.
- **Full Message Logging**: Logs real-time messages, media attachments, delivery receipts, and read receipts into Supabase `whatsapp_messages`.
- **Contact & Chat Sync**: Automatically synchronizes your WhatsApp contacts and active chats into Supabase with batch upserts.
- **Interactive Command Engine**:
  - `!ping` - Measure bot roundtrip latency
  - `!help` - Display available commands
  - `!status` - Show bot uptime, Node.js version, memory usage, and Supabase status
  - `!echo <text>` - Echo a message back to the sender
  - `!poll <question> | <opt1> | <opt2>` - Create an interactive WhatsApp poll
  - `!stats` - Query Supabase for total logged messages, contacts, and chats
  - `!info` - Display sender JID, chat ID, and group metadata
- **Resilient Reconnection**: Automatically detects connection dropouts and reconnects safely with exponential backoff (handles `DisconnectReason.loggedOut` cleanly).

---

## 📁 Project Structure

```text
whatsapp-bot/
├── src/
│   ├── bot/
│   │   └── commands.ts          # Interactive command registry & handlers
│   ├── config/
│   │   └── env.ts               # Environment configuration loader
│   ├── database/
│   │   ├── auth-store.ts        # Supabase-backed SignalKeyStore & AuthState
│   │   ├── chat-store.ts        # Chat synchronization
│   │   ├── contact-store.ts     # Contact synchronization
│   │   ├── message-store.ts     # Message logging, status & getMessage hook
│   │   └── supabase.ts          # Supabase client & connectivity check
│   ├── handlers/
│   │   └── connection.ts        # QR code, pairing code & reconnection logic
│   └── index.ts                 # Main bot lifecycle & unified event loop
├── supabase/
│   └── migrations/
│       └── 001_whatsapp_bot_init.sql  # Database schema & triggers
├── .env.example                 # Template for environment variables
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18 or higher (tested on Node.js v24)
- **Supabase Account**: A free project on [supabase.com](https://supabase.com)
- **WhatsApp Account**: WhatsApp installed on your mobile phone

### 2. Set Up Database Schema in Supabase

Open your Supabase project dashboard, navigate to the **SQL Editor**, and execute the migration file located at:
[`supabase/migrations/001_whatsapp_bot_init.sql`](supabase/migrations/001_whatsapp_bot_init.sql)

This creates the following tables:
- `whatsapp_auth_creds`: WhatsApp credentials & registration metadata
- `whatsapp_auth_keys`: Signal Protocol session encryption keys
- `whatsapp_contacts`: Synced WhatsApp contacts (names, phones, profile pictures)
- `whatsapp_chats`: Synced chats and unread counts
- `whatsapp_messages`: Logged incoming/outgoing messages and status updates

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your project settings:

```env
# Bot Configuration
BOT_NAME="KotlerX WhatsApp Bot"
SESSION_ID="default_session"

# Authentication Method: Set to true to use an 8-digit phone pairing code instead of scanning QR
USE_PAIRING_CODE=false
PHONE_NUMBER="919876543210" # Country code + number (no +, spaces, or dashes)

# Supabase Credentials
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" # Recommended for backend bot

# Bot Settings
COMMAND_PREFIX="!"
LOG_LEVEL="info" # 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error'
SYNC_FULL_HISTORY=false
```

### 4. Run the Bot

**Development mode (with hot-reload):**
```bash
npm run dev
```

**Production build & run:**
```bash
npm run build
npm start
```

### 5. Pair WhatsApp

#### Option A: QR Code (Default)
When prompted, scan the QR code displayed in the terminal using your phone:
> **WhatsApp → Settings → Linked Devices → Link a Device**

#### Option B: Pairing Code
Set `USE_PAIRING_CODE=true` in `.env`. The bot will display an 8-digit pairing code:
> **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead**

---

## 🛠️ Adding Custom Commands

New commands can easily be registered in [`src/bot/commands.ts`](src/bot/commands.ts) using `registerCommand`:

```typescript
registerCommand('hello', 'Say hello to the bot', '!hello', async (ctx) => {
  await ctx.sock.sendMessage(
    ctx.from,
    { text: `Hello ${ctx.pushName}! 👋` },
    { quoted: ctx.msg }
  )
})
```

---

## 📄 License
ISC
