import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');

    if (!shopId) return NextResponse.json({ error: 'Missing shop_id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
