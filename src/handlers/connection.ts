import { Boom } from '@hapi/boom'
import { ConnectionState, DisconnectReason, WASocket } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import readline from 'readline'
import { config } from '../config/env.js'

let isPairingRequested = false

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

export interface ConnectionHandlerResult {
  shouldReconnect: boolean
}

export async function handleConnectionUpdate(
  update: Partial<ConnectionState>,
  sock: WASocket
): Promise<ConnectionHandlerResult> {
  const { connection, lastDisconnect, qr } = update

  // 1. Handle QR Code or Pairing Code
  if (qr && !sock.authState.creds.registered) {
    if (config.usePairingCode) {
      if (!isPairingRequested) {
        isPairingRequested = true
        let phone = config.phoneNumber
        if (!phone) {
          console.log('\n======================================================')
          phone = await askQuestion(
            'Enter your phone number (digits only with country code, e.g. 15551234567):\n> '
          )
          phone = phone.replace(/\D/g, '')
        }

        if (phone) {
          try {
            console.log(`[Pairing] Requesting pairing code for +${phone}...`)
            const code = await sock.requestPairingCode(phone)
            console.log('\n======================================================')
            console.log(`🔗 WhatsApp Pairing Code:  ${code}`)
            console.log('Open WhatsApp > Linked Devices > Link with Phone Number Instead')
            console.log('======================================================\n')
          } catch (err) {
            console.error('[Pairing] Error requesting pairing code:', err)
          }
        } else {
          console.warn('[Pairing] No valid phone number provided for pairing code.')
        }
      }
    } else {
      console.log('\n======================================================')
      console.log('📱 Scan this QR code with WhatsApp on your phone:')
      console.log('======================================================\n')
      qrcode.generate(qr, { small: true })
      console.log('======================================================\n')
    }
  }

  // 2. Handle Connection State
  if (connection === 'open') {
    isPairingRequested = false
    const userJid = sock.user?.id || 'Unknown'
    console.log('\n======================================================')
    console.log(`✅ WhatsApp Bot connected successfully!`)
    console.log(`👤 Connected as: ${userJid}`)
    console.log(`🤖 Bot Name: ${config.botName}`)
    console.log('======================================================\n')
    return { shouldReconnect: false }
  }

  if (connection === 'close') {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
    const errorMsg = lastDisconnect?.error?.message || 'Unknown reason'

    console.warn(`[Connection] Connection closed (code: ${statusCode}, reason: ${errorMsg})`)

    const isLoggedOut = statusCode === DisconnectReason.loggedOut
    if (isLoggedOut) {
      console.error(
        '[Connection] Device was logged out. Please clear session data and re-authenticate.'
      )
      return { shouldReconnect: false }
    }

    // Any other error (e.g. restartRequired, timedOut, connectionLost) should trigger reconnect
    return { shouldReconnect: true }
  }

  return { shouldReconnect: false }
}
