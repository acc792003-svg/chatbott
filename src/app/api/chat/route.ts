import { NextResponse } from 'next/server';
import { processChat } from '@/lib/chatbot-engine';

export async function POST(req: Request) {
  try {
    const { message, history, shopId, sessionId, platform } = await req.json();

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
      platform: platform || 'widget'
    });

    // Trả về định dạng mà Widget mong đợi
    return NextResponse.json({ 
       response: result.answer, 
       intent: result.intent,
       source: result.source 
    });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
