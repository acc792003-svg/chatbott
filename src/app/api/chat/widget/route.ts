import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, history = [], code } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    // 1. Tìm shop
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const { data: config } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop.id).single();
    const shopName = config?.shop_name || shop.name;
    
    // 2. Chuẩn bị dữ liệu gửi trực tiếp tới Google (Dùng bản v1)
    const apiURL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Bạn là trợ lý cho ${shopName}. Thông tin: ${config?.product_info}. FAQ: ${config?.faq}. Khách hỏi: ${message}`;

    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Trả về lỗi chi tiết từ Google để chúng ta biết chính xác tại sao
      return NextResponse.json({ error: `Google API Error: ${data.error?.message || response.statusText}` }, { status: response.status });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Shop chưa rõ ý bạn, bạn nói lại nhé!';

    return NextResponse.json({ response: responseText, shop_name: shopName });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
