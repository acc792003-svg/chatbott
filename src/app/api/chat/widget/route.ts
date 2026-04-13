import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, code } = await req.json();
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    const { data: config } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop?.id).single();
    
    const shopName = config?.shop_name || shop?.name || 'Shop';
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });

    // Cấu trúc Prompt chuyên nghiệp để tránh AI bị loạn
    const systemPrompt = `
BẠN LÀ AI?
- Bạn là nhân viên bán hàng của shop "${shopName}".
- Hôm nay là: ${now}.

DỮ LIỆU CỬA HÀNG (CHỈ SỬ DỤNG KHI CẦN):
- Sản phẩm: ${config?.product_info || 'Đang cập nhật'}
- Câu hỏi thường gặp: ${config?.faq || 'Đang cập nhật'}

QUY TẮC TRẢ LỜI:
1. Trả lời ngắn gọn, thân thiện, xưng hô "Dạ", "Em".
2. KHÔNG bao giờ được liệt kê toàn bộ dữ liệu ra nếu khách không hỏi hết.
3. Nếu khách hỏi ngày giờ, hãy sử dụng thông tin "Hôm nay là" ở trên.
4. Ưu tiên giải đáp thắc mắc của khách một cách tự nhiên nhất.

CÂU HỎI CỦA KHÁCH:
"${message}"
`;

    // 1. DÒ TÌM MODEL (như cũ)
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listResponse.json();
    let candidates = listData.models?.filter((m: any) => m.supportedGenerationMethods.includes('generateContent')).map((m: any) => m.name) || [];
    if (candidates.length === 0) candidates = ['models/gemini-1.5-flash', 'models/gemini-pro'];

    // Né 2.5-flash vì hay quá tải
    candidates.sort((a: string) => a.includes('2.5-flash') ? 1 : -1);

    let finalResponse = null;
    let lastError = '';

    for (const fullModelName of candidates) {
       for (const version of ['v1', 'v1beta']) {
          try {
            const apiURL = `https://generativelanguage.googleapis.com/${version}/${fullModelName}:generateContent?key=${apiKey}`;
            const response = await fetch(apiURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { temperature: 0.3 } // Giảm Temperature để AI bớt "sáng tạo" quá đà
              })
            });
            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              finalResponse = data.candidates[0].content.parts[0].text;
              break;
            } else {
              lastError = data.error?.message || 'Unknown error';
            }
          } catch (e: any) { lastError = e.message; }
       }
       if (finalResponse) break;
    }

    if (!finalResponse) return NextResponse.json({ error: `Lỗi: ${lastError}` }, { status: 500 });
    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
