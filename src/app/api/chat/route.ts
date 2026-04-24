import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processChat } from '@/lib/chatbot-engine';
import { reportError } from '@/lib/radar';

export async function POST(req: Request) {
  try {
    const { message, history, shopId, sessionId, platform } = await req.json();
    
    // Lấy IP từ headers để phục vụ Anti-Spam
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (!shopId || !message) {
      return NextResponse.json({ error: 'Missing shopId or message' }, { status: 400 });
    }

    // 🔥 SỬ DỤNG BỘ NÃO PHASE 3 (Enterprise Engine)
    const result = await processChat({
      shopId,
      message,
      history: (history || []).map((m: any) => ({
        role: m.role || (m.type === 'bot' ? 'assistant' : 'user'),
        content: m.content || m.text || ''
      })),
      externalUserId: sessionId || 'unknown',
      platform: platform || 'widget',
      ip: ip.split(',')[0].trim() // Lấy IP gốc nếu qua Proxy
    });

    // Trả về định dạng mà Widget mong đợi
    return NextResponse.json({ 
       response: result.answer, 
       intent: result.intent,
       source: result.source 
    });

  } catch (error: any) {
    console.error('API Chat Error:', error.message);
    
    // 🔥 BÁO CÁO RADAR (Tự động gửi Telegram)
    if (supabaseAdmin) {
       reportError({
         errorType: 'INTERNAL_API_ERROR',
         errorMessage: error.message,
         fileSource: 'api/chat/route.ts',
         severity: 'high',
         metadata: { error: error.stack }
       }).catch(() => {});
    }

    return NextResponse.json({ error: 'Hệ thống đang bận hoặc ID không hợp lệ. Hãy kiểm tra Radar Super Admin.' }, { status: 503 });
  }
}
