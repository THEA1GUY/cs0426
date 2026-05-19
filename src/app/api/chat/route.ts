import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { searchDocuments, getEmbedding } from '@/lib/rag';
import { getSupabaseAdmin } from '@/lib/supabase';

// Initialize Groq Client using the OpenAI compatibility layer
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export const runtime = 'edge';

/**
 * CHAT API ROUTE
 * This is the core "Orchestrator" of the AI response.
 * It combines User Input + Search Context + System Personality.
 */
export async function POST(req: Request) {
  const { messages, department, conversationId, userId } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // PRE-PROCESSING: Run Guardrails, Embedding, and Persistence in parallel for maximum performance
  const guardrailPrompt = `
    You are a guardrail classifier for an AI Employee Onboarding Assistant.
    Determine if the user's prompt is relevant to company onboarding, company culture, employee benefits, internal tools, department procedures, IT tools, or standard human resources.
    If the prompt is off-topic (e.g., asking how to fix a car, write random coding algorithms, tell unrelated jokes, discuss politics, write general stories, etc.), return exactly "OFF_TOPIC".
    If it is on-topic, return exactly "ON_TOPIC".

    User Prompt: "${lastMessage.content}"

    Classification:
  `;

  const supabaseAdmin = getSupabaseAdmin();

  // Run independent tasks in parallel to reduce overall latency
  const [guardrailResult, embeddingResult] = await Promise.allSettled([
    generateText({
      model: groq('llama-3.3-70b-versatile') as any,
      prompt: guardrailPrompt,
      maxTokens: 5,
      temperature: 0,
    }),
    getEmbedding(lastMessage.content),
    // Fire-and-forget persistence of user message
    conversationId && lastMessage ? supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: lastMessage.content,
      input_type: 'text'
    }) : Promise.resolve(null)
  ]);

  // Handle Guardrail result - if off-topic, we short-circuit
  if (guardrailResult.status === 'fulfilled') {
    const classification = guardrailResult.value.text;
    if (classification.trim().includes("OFF_TOPIC")) {
      const refusalText = "👋 Hello! I am your dedicated Company Onboarding Assistant. To ensure you have a seamless transition, I am focused on assisting with onboarding topics, employee handbook policies, internal tools, department procedures, or company culture. If you have a question about how our company operates, let me know! For other topics, feel free to use the 'Escalate to Human' button above to get help from your department head.";
      
      if (conversationId) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: refusalText
        });
      }

      // Return as a proper AI data stream so useChat can render it
      const refusalResult = await streamText({
        model: groq('llama-3.3-70b-versatile') as any,
        messages: [{ role: 'user', content: 'Say exactly this and nothing else: ' + refusalText }],
        maxTokens: 200,
      });
      return refusalResult.toDataStreamResponse();
    }
  }

  // STEP 2: RETRIEVAL (The 'R' in RAG) & CITATION JOINING
  let context = '';

  if (embeddingResult.status === 'fulfilled') {
    try {
      const docs = await searchDocuments(embeddingResult.value, department);

      context = docs.map((d: any) => {
        const sourceLabel = d.document_title ? `Document: "${d.document_title}" (Dept: ${d.document_department || 'General'})` : 'Document: Internal Wiki';
        return `[${sourceLabel}]\n${d.content_chunk}`;
      }).join('\n\n');
    } catch (err) {
      console.error('RAG Error:', err);
    }
  }
  
  // STEP 3: PROMPT ENGINEERING
  const systemPrompt = `
    You are an AI Onboarding Assistant for new employees.
    Your goal is to provide accurate, professional, and welcoming information.
    
    User Profile:
    - Department: ${department || 'General'}
    
    Context from company documents:
    ${context || 'No specific document context found.'}
    
    Instructions:
    - Use the provided context to answer the user's questions accurately.
    - If you used information from a specific document in your answer, you MUST list the document as a source at the very bottom of your response in a bulleted section titled "📚 Sources Cited:". Mention the exact document title and department as shown in the source tags in the context.
    - If the answer isn't in the context, use your general knowledge but state that it's general company onboarding information.
    - If you are uncertain or the request requires human intervention, suggest escalating to a department head.
    - Always maintain a professional, welcoming, and helpful tone.
  `;

  // STEP 4: GENERATION & PERSISTENCE
  // We stream the response and save the final result to the database when finished.
  const result = await streamText({
    model: groq('llama-3.3-70b-versatile') as any,
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      if (conversationId) {
        const supabase = getSupabaseAdmin();
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: text
        });
      }
    }
  });

  return result.toDataStreamResponse();
}
