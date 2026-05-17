import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

// helper function to verify if the requesting user is an admin
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  const { data: profiles, error: err1 } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  const { data: preRegistered, error: err2 } = await supabase
    .from('pre_registered_staff')
    .select('*')
    .order('created_at', { ascending: false });

  if (err1 || err2) {
    return NextResponse.json({ error: err1?.message || err2?.message }, { status: 500 });
  }

  return NextResponse.json({ profiles, preRegistered });
}

export async function POST(req: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const { email, name, department, job_title, role } = await req.json();
  if (!email || !name) {
    return NextResponse.json({ error: 'Email and Name are required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // insert into pre-registration allowed list
  const { data, error } = await supabase
    .from('pre_registered_staff')
    .insert({
      email: email.toLowerCase().trim(),
      name,
      department,
      job_title,
      role,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const { type, email, id, role, status } = await req.json();
  const supabase = getSupabaseAdmin();

  if (type === 'pre-register') {
    // update pre-registered record
    const { error } = await supabase
      .from('pre_registered_staff')
      .update({ role, status })
      .eq('email', email);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // update active profile
    const { error } = await supabase
      .from('profiles')
      .update({ role, status })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // also sync to pre-registration if email exists
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', id).single();
    if (profile?.email) {
      await supabase
        .from('pre_registered_staff')
        .update({ role, status })
        .eq('email', profile.email);
    }
  }

  return NextResponse.json({ success: true });
}
