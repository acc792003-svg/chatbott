
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopCode = searchParams.get('code');
    const clientId = searchParams.get('clientId');

    if (!shopCode || !clientId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    }

    // 1. Lấy shop_id từ code (đảm bảo bảo mật và đúng shop)
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('id, name')
      .eq('code', shopCode)
      .single();

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // 2. Lấy 3 cặp hội thoại gần nhất (tổng 3 bản ghi messages)
    // Mỗi bản ghi chứa cả user_message và ai_response
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('user_message, ai_response, created_at')
      .eq('shop_id', shop.id)
      .eq('session_id', clientId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    // Trả về history theo thứ tự thời gian tăng dần
    return NextResponse.json({
      history: messages ? messages.reverse() : [],
      shop_name: shop.name
    });

  } catch (error: any) {
    console.error('History API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
