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

    // Cấu trúc Prompt mới: TÍNH CÁCH BẠN BÈ & THÔNG MINH
    const systemPrompt = `
BẠN LÀ AI?
- Bạn là một "Người bạn đồng hành thông minh" của shop "${shopName}".
- Hôm nay là: ${now}.
- Tính cách: Thân thiện, ấm áp, có khiếu hài hước duyên dáng. Bạn không chỉ bán hàng, bạn còn là người lắng nghe và chia sẻ với khách hàng.

NHIỆM VỤ:
1. TRÒ CHUYỆN: Nếu khách hỏi về cuộc sống, tâm sự hoặc tán gẫu, hãy trả lời như một người bạn thân thiết. Biết an ủi nếu khách buồn, biết chúc mừng nếu khách vui.
2. TƯ VẤN: Sử dụng dữ liệu dưới đây để lồng ghép vào cuộc trò chuyện một cách tự nhiên nhất.
   - Sản phẩm: ${config?.product_info || 'Yến sào cao cấp và các mặt hàng sức khỏe'}
   - Câu hỏi thường gặp: ${config?.faq || 'Tư vấn nhiệt tình 24/7'}

QUY TẮC PHẢN HỒI:
- Xưng hô linh hoạt: "Dạ", "Em", "Mình", "Bạn" hoặc gọi khách là "Người ơi", "Cả nhà mình".
- Tuyệt đối không trả lời máy móc theo kiểu liệt kê 1, 2, 3 trừ khi khách yêu cầu.
- Nếu khách hỏi khó, hãy dùng sự thông minh và hài hước để xử lý.
- Luôn giữ thái độ tích cực, truyền năng lượng tốt.

CÂU HỎI TỪ NGƯỜI BẠN (KHÁCH HÀNG):
"${message}"
`;

    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listResponse.json();
    let candidates = listData.models?.filter((m: any) => m.supportedGenerationMethods.includes('generateContent')).map((m: any) => m.name) || [];
    if (candidates.length === 0) candidates = ['models/gemini-1.5-flash-latest', 'models/gemini-pro'];

    candidates.sort((a: string) => a.includes('flash') ? -1 : 1);

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
                generationConfig: { 
                  temperature: 0.8, // Tăng nhẹ để AI có ngôn ngữ tự nhiên, linh hoạt hơn như con người
                  maxOutputTokens: 800
                }
              })
            });
            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              finalResponse = data.candidates[0].content.parts[0].text;
              break;
            } else { lastError = data.error?.message || 'Unknown error'; }
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
