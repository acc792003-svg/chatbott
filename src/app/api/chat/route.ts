import { NextResponse } from 'next/server';
import { callGeminiWithFallback } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { message, shopConfig, history, shopId } = await req.json();

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    const systemInstruction = `Hôm nay là ${now}. Bạn là trợ lý AI thân thiện của cửa hàng "${shopConfig?.shop_name || 'Shop'}". 
Thông tin sản phẩm: ${shopConfig?.product_info || 'Chưa cập nhật'}.
FAQ: ${shopConfig?.faq || 'Chưa cập nhật'}.
Hãy trả lời tự nhiên, thân thiện, nhớ ngữ cảnh cuộc trò chuyện.`;

    let contents: any[] = [];

    if (history && history.length > 0) {
      contents = history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts || [{ text: m.content || '' }]
      }));
    } else {
      contents = [{ role: 'user', parts: [{ text: message }] }];
    }

    if (contents.length > 0 && contents[0].role === 'model') {
      contents = contents.slice(1);
    }
    
    if (contents.length > 0 && contents[0].role === 'user') {
      const originalText = contents[0].parts[0]?.text || '';
      contents[0] = {
        role: 'user',
        parts: [{ text: `[Hệ thống: ${systemInstruction}]\n\nKhách hàng: ${originalText}` }]
      };
    }

    const responseText = await callGeminiWithFallback(contents, undefined, shopId || null);

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
