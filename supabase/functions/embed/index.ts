// Supabase Edge Function to generate embeddings using gte-small
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { input } = await req.json()

    if (!input) {
      return new Response(JSON.stringify({ error: "Input is required" }), { status: 400 })
    }

    // Use the built-in Supabase.ai.Session
    // Note: This is available in the Supabase Edge Runtime environment
    // @ts-ignore
    const session = new Supabase.ai.Session('gte-small');

    const embedding = await session.run(input, {
      mean_pool: true,
      normalize: true,
    });

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
