import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processChat } from '@/lib/chatbot-engine';

export async function POST(req: Request) {
  try {
    const { message, code, history, clientId } = await req.json();

    if (!code || !message) {
      return NextResponse.json({ error: 'Thiếu mã Shop hoặc tin nhắn' }, { status: 400 });
    }

    // 1. Tìm shop_id từ code
    const { data: shop } = await supabase.from('shops').select('id, name').eq('code', code).single();
    if (!shop) {
      return NextResponse.json({ error: 'Không tìm thấy Shop' }, { status: 404 });
    }

    // 2. 🔥 GỌI BỘ NÃO PHASE 3 (Enterprise Engine)
    const result = await processChat({
      shopId: shop.id,
      message: message,
      history: (history || []).map((m: any) => ({
        role: m.role || (m.type === 'bot' ? 'assistant' : 'user'),
        content: m.content || m.text || ''
      })),
      externalUserId: clientId || 'unknown',
      platform: 'widget'
    });

    return NextResponse.json({ 
       response: result.answer,
       shop_name: shop.name 
    });

  } catch (error: any) {
    console.error('Widget API Error:', error);
    return NextResponse.json({ error: 'Hệ thống AI đang bận, vui lòng thử lại.' }, { status: 503 });
  }
}
