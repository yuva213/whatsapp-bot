# KotlerX WhatsApp Bot & Supabase Command Center

A high-performance WhatsApp bot built using [Baileys](https://baileys.wiki) and integrated with [Supabase](https://supabase.com) for production session persistence, full message logging, and contact synchronization — featuring a sleek **Next.js Web Dashboard**.

---

## ✨ Features

- **Direct WebSocket Protocol**: Connects to WhatsApp Web API directly over WebSockets with zero browser/Chromium/Selenium overhead.
- **Next.js Web Dashboard**: Real-time browser command center powered by `@supabase/ssr` to view message feeds, contact directories, and bot health stats.
- **Supabase-Backed Authentication**: Signal Protocol keys and auth credentials are automatically serialized with `BufferJSON` and stored in Supabase PostgreSQL tables.
- **Graceful Fallback**: If Supabase credentials are missing or connection fails, automatically falls back to local file-based storage (`auth_info_*`) without crashing.
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
├── app/                         # Next.js App Router Web Dashboard
│   ├── globals.css              # Glassmorphic dark theme with WhatsApp emerald palette
│   ├── layout.tsx               # Root layout & typography
│   └── page.tsx                 # Live monitoring dashboard with Supabase SSR
├── utils/
│   └── supabase/                # Next.js Supabase helpers
│       ├── client.ts            # Browser client (@supabase/ssr)
│       ├── middleware.ts        # Session refresh middleware
│       └── server.ts            # Server-side client (cookies())
├── src/                         # WhatsApp Bot Backend (Baileys)
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
├── middleware.ts                # Next.js request routing middleware
├── .env                         # Bot and Supabase credentials
├── .env.local                   # Next.js local environment variables
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18 or higher (tested on Node.js v24)
- **Supabase Account**: Connected to `https://ytledgcmvsdjyezkdopb.supabase.co`
- **WhatsApp Account**: WhatsApp installed on your mobile phone

### 2. Environment Variables

Your `.env` and `.env.local` files are configured:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ytledgcmvsdjyezkdopb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qSLELzU5RkeHvbeG3RcJ0Q_kNlQ32S9
SUPABASE_URL=https://ytledgcmvsdjyezkdopb.supabase.co
SUPABASE_ANON_KEY=sb_publishable_qSLELzU5RkeHvbeG3RcJ0Q_kNlQ32S9
```

### 3. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Launch the **Next.js Web Dashboard** at [http://localhost:3000](http://localhost:3000) |
| `npm run bot` | Launch the **WhatsApp Bot** (connects to WhatsApp Web & syncs to Supabase) |
| `npm run build` | Build the Next.js production web application |
| `npm run build:bot` | Build the standalone TypeScript bot backend into `./dist` |
| `npm run lint` | Run TypeScript type checks across the entire project |

---

## 📱 Running the Bot & Dashboard

1. **Start the Web Dashboard**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

2. **In a second terminal, start the WhatsApp Bot**:
   ```bash
   npm run bot
   ```
   Scan the terminal QR code using WhatsApp on your phone (**Linked Devices → Link a Device**).

3. Once connected:
   - Your messages, contacts, and active chats will stream directly into Supabase.
   - The Next.js dashboard will display your live metrics, message feed, and contact list in real time!
   - Test commands in any WhatsApp chat: `!ping`, `!status`, `!help`, `!echo hello`, `!stats`.

---

## 📄 License
ISC
