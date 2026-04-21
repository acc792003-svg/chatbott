import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { processChat } from '@/lib/chatbot-engine';

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
    const { message, code, history, clientId } = body;

    if (!code || !message) {
      return NextResponse.json({ error: 'Thiếu mã Shop hoặc tin nhắn' }, { status: 400 });
    }

    // 1. Tìm shop_id từ code (Làm sạch mã và tìm case-insensitive)
    const cleanCode = (code || '').trim().replace(/^#/, '');
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, code')
      .ilike('code', cleanCode)
      .maybeSingle();
    
    if (!shop) {
      // 🔥 BÁO CÁO RADAR: SHOP KHÔNG TỒN TẠI (Dùng AWAIT)
      if (supabaseAdmin || supabase) {
        const client = supabaseAdmin || supabase;
        await client.from('system_errors').insert({
          error_type: 'SHOP_NOT_FOUND',
          error_message: `Mã shop không tồn tại trong hệ thống: ${code} (Làm sạch: ${cleanCode})`,
          file_source: 'api/chat/widget/route.ts',
          metadata: { shopCode: code, cleanCode, clientId: clientId || 'unknown', dbError: shopError?.message }
        });
      }

      return NextResponse.json({ error: 'Không tìm thấy Shop. Kiểm tra lại mã nhúng.' }, { status: 404 });
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
       shop_name: result.shopName || shop.name 
    });

  } catch (error: any) {
    console.error('Widget API Error:', error);

    // 🔥 BÁO CÁO RADAR: LỖI HỆ THỐNG CẤP ĐỘ API (Dùng AWAIT)
    const client = supabaseAdmin || supabase;
    if (client) {
        await client.from('system_errors').insert({
          shop_id: null,
          error_type: 'WIDGET_API_CRASH_STABLE',
          error_message: error.message,
          file_source: 'api/chat/widget/route.ts',
          metadata: { shopCode: body?.code, stack: error.stack }
        });
    }

    return NextResponse.json({ error: 'Hệ thống AI đang bận, vui lòng thử lại.' }, { status: 503 });
  }
}
