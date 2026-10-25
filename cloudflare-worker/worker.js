/**
 * Cloudflare Worker for WhatsApp Bot AI
 * Bindings needed in wrangler.toml or Cloudflare Dashboard:
 * - AI: Ai (Workers AI binding)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
    };

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "WhatsApp Bot Cloudflare AI Worker" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Text Generation Endpoint: POST /api/text
    if (url.pathname === "/api/text" && request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = body.prompt;
        const systemPrompt =
          body.systemPrompt ||
          "You are a helpful, smart WhatsApp AI assistant. Reply clearly with concise WhatsApp markdown formatting (*bold*, _italic_, `code`).";
        const model = body.model || "@cf/meta/llama-3.1-8b-instruct";

        if (!prompt) {
          return new Response(JSON.stringify({ error: "Prompt is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response = await env.AI.run(model, {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        });

        return new Response(JSON.stringify({ response: response.response }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Image Generation Endpoint: POST /api/image
    if (url.pathname === "/api/image" && request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = body.prompt;
        const model = body.model || "@cf/stabilityai/stable-diffusion-xl-base-1.0";

        if (!prompt) {
          return new Response(JSON.stringify({ error: "Prompt is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const imageBytes = await env.AI.run(model, {
          prompt: prompt,
        });

        return new Response(imageBytes, {
          headers: {
            ...corsHeaders,
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
