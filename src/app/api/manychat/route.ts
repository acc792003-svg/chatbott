import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processChat } from '@/lib/chatbot-engine';

/**
 * 🤖 MANYCHAT AI INTEGRATION ROUTE
 * This endpoint allows ManyChat to send messages to the AI engine.
 * Expected Headers:
 * - Authorization: Bearer mc_xxx
 * Expected Body:
 * - shop_code: string
 * - user_id: string
 * - message: string
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    const { shop_code, user_id, message } = body;

    if (!shop_code || !user_id || !message) {
      return NextResponse.json({ error: 'Missing shop_code, user_id, or message' }, { status: 400 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing API Key' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // 1. Verify Shop and API Key
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, code, manychat_api_key, plan')
      .eq('code', shop_code)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (shop.manychat_api_key !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    // 2. Fetch Recent Chat History (5 messages)
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('user_message, ai_response')
      .eq('shop_id', shop.id)
      .eq('session_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const history = (messages || []).reverse().flatMap((m: any) => [
      { role: 'user', content: m.user_message },
      { role: 'assistant', content: m.ai_response }
    ]);

    // 3. Process Chat using the Enterprise Engine
    const result = await processChat({
      shopId: shop.id,
      message,
      history,
      externalUserId: user_id,
      platform: 'facebook', // ManyChat is Facebook
      isPro: shop.plan === 'pro'
    });

    // 4. Return formatted response
    const { searchParams } = new URL(req.url);
    const platformParam = searchParams.get('platform');

    // Nếu là Ahachat (JSON API block), trả về định dạng mảng tin nhắn để Bot tự hiển thị
    if (platformParam === 'ahachat') {
      return NextResponse.json({
        messages: [
          { text: result.answer }
        ]
      });
    }

    // Mặc định trả về định dạng đơn giản (Dùng cho ManyChat hoặc các bên khác tự map biến)
    return NextResponse.json({
      success: true,
      text: result.answer,
      intent: result.intent,
      source: result.source
    });

  } catch (error: any) {
    console.error('ManyChat API Error:', error.message);
    
    // Report to Radar
    if (supabaseAdmin) {
        supabaseAdmin.from('system_errors').insert({
          error_type: 'MANYCHAT_API_ERROR',
          error_message: error.message,
          file_source: 'api/manychat/route.ts',
          metadata: { stack: error.stack }
        }).then(() => {});
    }

    return NextResponse.json({ 
        success: false, 
        text: 'Hệ thống AI đang bận, vui lòng thử lại sau giây lát. 🙏' 
    }, { status: 500 });
  }
}
