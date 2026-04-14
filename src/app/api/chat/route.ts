import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, shopConfig, history } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    // System instruction để AI hiểu vai trò
    const systemInstruction = `Hôm nay là ${now}. Bạn là trợ lý AI thân thiện của cửa hàng "${shopConfig?.shop_name || 'Shop'}". 
Thông tin sản phẩm: ${shopConfig?.product_info || 'Chưa cập nhật'}.
FAQ: ${shopConfig?.faq || 'Chưa cập nhật'}.
Hãy trả lời tự nhiên, thân thiện, nhớ ngữ cảnh cuộc trò chuyện.`;

    // Xây dựng contents với lịch sử hội thoại đầy đủ
    let contents: any[] = [];

    if (history && history.length > 0) {
      // Chuyển đổi lịch sử: role 'assistant' → 'model' (Gemini yêu cầu)
      contents = history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts || [{ text: m.content || '' }]
      }));
    } else {
      // Nếu không có lịch sử, chỉ gửi câu hỏi hiện tại
      contents = [{ role: 'user', parts: [{ text: message }] }];
    }

    // Đảm bảo tin nhắn đầu tiên luôn là 'user' (yêu cầu của Gemini API)
    if (contents.length > 0 && contents[0].role === 'model') {
      contents = contents.slice(1);
    }
    
    // Chèn system instruction vào đầu tin nhắn user đầu tiên
    if (contents.length > 0 && contents[0].role === 'user') {
      const originalText = contents[0].parts[0]?.text || '';
      contents[0] = {
        role: 'user',
        parts: [{ text: `[Hệ thống: ${systemInstruction}]\n\nKhách hàng: ${originalText}` }]
      };
    }

    const candidates = [
      'models/gemini-2.5-flash',
      'models/gemini-1.5-flash-8b',
      'models/gemini-1.5-pro',
      'models/gemini-1.0-pro',
      'models/gemini-pro'
    ];

    let finalResponse = null;
    let lastError = '';

    for (const fullModelName of candidates) {
      for (const version of ['v1beta', 'v1']) {
        try {
          const apiURL = `https://generativelanguage.googleapis.com/${version}/${fullModelName}:generateContent?key=${apiKey}`;
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: contents,
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1000
              }
            })
          });
          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            finalResponse = data.candidates[0].content.parts[0].text;
            break;
          } else {
            lastError = data.error?.message || 'Google API Error';
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }
      if (finalResponse) break;
    }

    if (!finalResponse) {
      return NextResponse.json({ error: lastError }, { status: 503 });
    }

    return NextResponse.json({ response: finalResponse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
