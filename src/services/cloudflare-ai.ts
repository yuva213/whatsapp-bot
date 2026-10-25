import { config } from '../config/env.js'

export class CloudflareAIService {
  public static isConfigured(): boolean {
    return (
      !!config.cloudflareWorkerUrl ||
      (!!config.cloudflareAccountId && !!config.cloudflareApiToken)
    )
  }

  /**
   * Generate text using Cloudflare Workers AI (e.g., Llama 3.1 8B Instruct)
   */
  public static async generateText(
    prompt: string,
    systemPrompt: string = 'You are a helpful, intelligent WhatsApp AI assistant. Reply concisely and format with WhatsApp markdown (*bold*, _italic_, `code`).'
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'Cloudflare AI is not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your .env file.'
      )
    }

    // 1. If custom Cloudflare Worker URL is provided
    if (config.cloudflareWorkerUrl) {
      const endpoint = `${config.cloudflareWorkerUrl.replace(/\/$/, '')}/api/text`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt, model: config.cloudflareTextModel })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Worker returned error [${res.status}]: ${errorText}`)
      }

      const data = (await res.json()) as any
      return data.response || data.result?.response || data.text || JSON.stringify(data)
    }

    // 2. Direct Cloudflare Workers AI REST API
    const model = config.cloudflareTextModel
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/run/${model}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.cloudflareApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Cloudflare AI API error [${res.status}]: ${errorText}`)
    }

    const json = (await res.json()) as any
    if (!json.success && json.errors && json.errors.length > 0) {
      throw new Error(`Cloudflare AI Error: ${json.errors[0]?.message || 'Unknown error'}`)
    }

    const responseText = json.result?.response || json.result || 'No response generated.'
    return typeof responseText === 'string' ? responseText : JSON.stringify(responseText)
  }

  /**
   * Generate an image using Cloudflare Workers AI (e.g. Stable Diffusion XL or Flux)
   * Returns a Buffer ready to be sent via WhatsApp Baileys socket.
   */
  public static async generateImage(prompt: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error(
        'Cloudflare AI is not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your .env file.'
      )
    }

    // 1. If custom Cloudflare Worker URL is provided
    if (config.cloudflareWorkerUrl) {
      const endpoint = `${config.cloudflareWorkerUrl.replace(/\/$/, '')}/api/image`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: config.cloudflareImageModel })
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Worker returned error [${res.status}]: ${errText}`)
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as any
        const base64 = json.image || json.result?.image
        if (base64) {
          return Buffer.from(base64, 'base64')
        }
      }

      const arrayBuf = await res.arrayBuffer()
      return Buffer.from(arrayBuf)
    }

    // 2. Direct Cloudflare Workers AI REST API
    const model = config.cloudflareImageModel
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/run/${model}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.cloudflareApiToken}`,
        'Content-Type': 'application/json',
        Accept: 'image/png, image/jpeg, application/json'
      },
      body: JSON.stringify({
        prompt: prompt
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Cloudflare Image AI error [${res.status}]: ${errorText}`)
    }

    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const json = (await res.json()) as any
      if (!json.success && json.errors && json.errors.length > 0) {
        throw new Error(`Cloudflare AI Error: ${json.errors[0]?.message || 'Image generation failed'}`)
      }
      const b64 = json.result?.image || json.image
      if (b64) {
        return Buffer.from(b64, 'base64')
      }
    }

    // Binary image buffer returned
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}
