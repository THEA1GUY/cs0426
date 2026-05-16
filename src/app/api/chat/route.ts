import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { searchDocuments, getEmbedding } from '@/lib/rag';

// OpenRouter configuration
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, department } = await req.json();
  const lastMessage = messages[messages.length - 1]?.content || '';

  // 1. Retrieve relevant document chunks from Supabase (RAG)
  let context = '';
  try {
    const embedding = await getEmbedding(lastMessage);
    const docs = await searchDocuments(embedding, department);
    context = docs.map((d: any) => d.content_chunk).join('\n\n');
  } catch (err) {
    console.error('RAG Error:', err);
  }
  
  // 2. Construct System Prompt
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

  // 3. Call OpenRouter
  const result = await streamText({
    model: openrouter('meta-llama/llama-3.3-70b-instruct:free'),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
