import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { supabase, supabaseAdmin } = await import('@/lib/supabase');
    const client = supabaseAdmin || supabase;
    if (!client) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    
    const { data } = await client
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    return NextResponse.json({ errors: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
