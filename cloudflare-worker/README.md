# Cloudflare Workers AI for WhatsApp Bot

This directory contains a ready-to-deploy Cloudflare Worker providing REST endpoints for text generation (Llama 3.1) and image generation (Stable Diffusion XL).

---

## ⚡ Option 1: Direct API (No Deployment Needed)

You do **not** even have to deploy this worker if you don't want to! The WhatsApp bot can call Cloudflare Workers AI directly via Cloudflare's REST API.

### How to get your Cloudflare Keys:
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Look at the right sidebar on your dashboard to find your **Account ID**.
3. Go to **My Profile → API Tokens → Create Token**.
4. Choose **Workers AI (Read)** template (or create custom token with `Workers AI: Read` permission).
5. Copy the Account ID and Token into your [`.env`](../.env) file:
   ```env
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_API_TOKEN=your_api_token
   ```

---

## 🚀 Option 2: Deploy as a Cloudflare Worker

If you prefer to deploy this worker to your own `*.workers.dev` subdomain:

1. Inside this folder, run:
   ```bash
   cd cloudflare-worker
   npx wrangler login
   npx wrangler deploy
   ```

2. After deployment, copy your Worker URL (e.g. `https://whatsapp-bot-cloudflare-ai.<subdomain>.workers.dev`) and set it in your [`.env`](../.env):
   ```env
   CLOUDFLARE_WORKER_URL=https://whatsapp-bot-cloudflare-ai.<subdomain>.workers.dev
   ```

---

## 🤖 Available WhatsApp Commands

- `!ai <question>`: Asks Llama 3.1 8B Instruct and returns an intelligent response.
- `!image <prompt>`: Generates a photorealistic AI image via Stable Diffusion XL and sends the image file directly in the WhatsApp chat.
- `!models`: Displays the active Cloudflare AI models.
