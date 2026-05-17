import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
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

  // STEP 1: PERSIST USER MESSAGE
  // This allows for Chat History and future FAQ generation analysis.
  if (conversationId && lastMessage) {
    const supabase = getSupabaseAdmin();
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: lastMessage.content,
      input_type: 'text'
    });
  }

  // STEP 2: RETRIEVAL (The 'R' in RAG)
  let context = '';
  try {
    const embedding = await getEmbedding(lastMessage.content);
    const docs = await searchDocuments(embedding, department);
    context = docs.map((d: any) => d.content_chunk).join('\n\n');
  } catch (err) {
    console.error('RAG Error:', err);
  }
  
  // STEP 3: PROMPT ENGINEERING
  const systemPrompt = `
    You are an AI Onboarding Assistant for new employees.
    Your goal is to provide accurate, professional, and helpful information.
    
    User Profile:
    - Department: ${department || 'General'}
    
    Context from company documents:
    ${context || 'No specific document context found.'}
    
    Instructions:
    - Use the provided context to answer questions accurately.
    - If the answer isn't in the context, use your general knowledge but state that it's general information.
    - If you are uncertain or the request requires human intervention, suggest escalating to a department head.
    - Always maintain a professional and welcoming tone.
  `;

  // STEP 4: GENERATION & PERSISTENCE
  // We stream the response and save the final result to the database when finished.
  const result = await streamText({
    model: groq('llama-3.3-70b-versatile'),
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
