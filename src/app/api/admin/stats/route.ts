import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

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
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch live metrics
    const { count: totalDocs, error: err1 } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    const { count: totalEmployees, error: err2 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: pendingEscalations, error: err3 } = await supabase
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'awaiting_response']);

    if (err1 || err2 || err3) {
      throw new Error(err1?.message || err2?.message || err3?.message || 'Database query failed');
    }

    // 2. Fetch last 7 days message activity for chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: messages, error: err4 } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (err4) throw err4;

    // Group messages by day
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      return {
        label: dateStr,
        dateKey: d.toISOString().split('T')[0],
        count: 0
      };
    }).reverse();

    messages.forEach((m: any) => {
      const msgDateKey = m.created_at.split('T')[0];
      const match = chartData.find(c => c.dateKey === msgDateKey);
      if (match) {
        match.count += 1;
      }
    });

    // Calculate dynamic AI satisfaction percentage
    // Based on escalations versus total profiles
    const resolvedEscalationsCount = await supabase
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');
    
    const totalEscalations = (pendingEscalations || 0) + (resolvedEscalationsCount.count || 0);
    const satisfaction = totalEmployees && totalEmployees > 0
      ? Math.max(85, Math.min(99.5, 100 - ((pendingEscalations || 0) / totalEmployees * 15)))
      : 95.0;

    return NextResponse.json({
      metrics: {
        totalDocuments: totalDocs || 0,
        totalEmployees: totalEmployees || 0,
        pendingEscalations: pendingEscalations || 0,
        satisfaction: parseFloat(satisfaction.toFixed(1))
      },
      chartData
    });
  } catch (error: any) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
