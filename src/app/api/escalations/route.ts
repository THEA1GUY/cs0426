import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Access denied.' }, { status: 401 });
    }

    // Verify user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'department_head')) {
      return NextResponse.json({ error: 'Forbidden: Admin or Department Head role required.' }, { status: 403 });
    }

    const adminClient = getSupabaseAdmin();

    let query = adminClient
      .from('escalations')
      .select(`
        *,
        employee:user_id(name, department, job_title),
        dept_head:dept_head_id(name, department, job_title)
      `);

    // If the requester is a department head, they only see escalations assigned to them
    if (profile.role === 'department_head') {
      query = query.eq('dept_head_id', user.id);
    }

    const { data: escalations, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(escalations);
  } catch (error: any) {
    console.error('Escalation GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      model: openrouter('meta-llama/llama-3.3-70b-instruct:free') as any,
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

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'department_head')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { escalationId, status } = await req.json();

    if (!escalationId || !status) {
      return NextResponse.json({ error: 'Escalation ID and Status are required' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();

    const { data, error } = await adminClient
      .from('escalations')
      .update({ status })
      .eq('id', escalationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Escalation PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

