import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { searchDocuments, getEmbedding } from '@/lib/rag';

// OpenRouter configuration
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = 'edge';

/**
 * CHAT API ROUTE
 * This is the core "Orchestrator" of the AI response.
 * It combines User Input + Search Context + System Personality.
 */
export async function POST(req: Request) {
  const { messages, department } = await req.json();
  const lastMessage = messages[messages.length - 1]?.content || '';

  // STEP 1: RETRIEVAL (The 'R' in RAG)
  // We turn the user's question into a vector and find relevant company info.
  let context = '';
  try {
    const embedding = await getEmbedding(lastMessage);
    const docs = await searchDocuments(embedding, department);
    context = docs.map((d: any) => d.content_chunk).join('\n\n');
  } catch (err) {
    console.error('RAG Error:', err);
  }
  
  // STEP 2: PROMPT ENGINEERING
  // We give the AI a "System Prompt" that defines its behavior and provides the context.
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

  // STEP 3: GENERATION (The 'G' in RAG)
  // We stream the response back to the user for a "real-time" typing effect.
  const result = await streamText({
    model: openrouter('meta-llama/llama-3.3-70b-instruct:free'),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
