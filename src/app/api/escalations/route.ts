import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getSupabaseAdmin } from '@/lib/supabase';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { conversationId, userId, departmentHeadId } = await req.json();

    const supabase = getSupabaseAdmin();

    // 1. Fetch conversation history
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // 2. Generate summary using LLM
    const { text: summary } = await generateText({
      model: openrouter('meta-llama/llama-3.3-70b-instruct:free'),
      prompt: `
        Please summarize the following conversation between a new employee and an AI assistant.
        The goal is to provide a clear, concise summary for a department head to understand the issue.
        
        Conversation:
        ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
        
        Summary:
      `,
    });

    // 3. Create escalation record
    const { data: escalation, error: insertError } = await supabase
      .from('escalations')
      .insert({
        user_id: userId,
        dept_head_id: departmentHeadId,
        summary,
        status: 'open',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(escalation);
  } catch (error: any) {
    console.error('Escalation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
