import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Access denied.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const escalationId = searchParams.get('escalationId');

    if (!escalationId) {
      return NextResponse.json({ error: 'escalationId parameter is required' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    
    // Check if the user is the employee, department head, or an admin
    const { data: escalation, error: escErr } = await adminClient
      .from('escalations')
      .select('user_id, dept_head_id')
      .eq('id', escalationId)
      .single();

    if (escErr || !escalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const hasAccess = 
      escalation.user_id === user.id || 
      escalation.dept_head_id === user.id || 
      profile?.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this escalation.' }, { status: 403 });
    }

    // Retrieve conversation history
    const { data: messages, error } = await adminClient
      .from('escalation_messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        sender:sender_id(name, role)
      `)
      .eq('escalation_id', escalationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json(messages || []);
  } catch (error: any) {
    console.error('Escalation messages GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Access denied.' }, { status: 401 });
    }

    const { escalationId, content } = await req.json();

    if (!escalationId || !content || !content.trim()) {
      return NextResponse.json({ error: 'escalationId and content are required' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    
    // Check access
    const { data: escalation, error: escErr } = await adminClient
      .from('escalations')
      .select('user_id, dept_head_id, status')
      .eq('id', escalationId)
      .single();

    if (escErr || !escalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isEmployee = escalation.user_id === user.id;
    const isDeptHead = escalation.dept_head_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isEmployee && !isDeptHead && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this escalation.' }, { status: 403 });
    }

    // Insert new message
    const { data: msg, error } = await adminClient
      .from('escalation_messages')
      .insert({
        escalation_id: escalationId,
        sender_id: user.id,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        sender_id,
        sender:sender_id(name, role)
      `)
      .single();

    if (error) throw error;

    // Automatically update the escalation ticket status:
    // If user is employee -> state is open (needs admin response)
    // If user is admin/dept head -> state is awaiting_response (waiting for employee feedback)
    let nextStatus = escalation.status;
    if (isEmployee) {
      nextStatus = 'open';
    } else if (isDeptHead || isAdmin) {
      nextStatus = 'awaiting_response';
    }

    if (nextStatus !== escalation.status) {
      await adminClient
        .from('escalations')
        .update({ status: nextStatus })
        .eq('id', escalationId);
    }

    return NextResponse.json(msg);
  } catch (error: any) {
    console.error('Escalation messages POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
