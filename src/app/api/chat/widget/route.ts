import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, history = [], code } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const { data: config } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop.id).single();
    const shopName = config?.shop_name || shop.name;
    const prompt = `Bạn là trợ lý cho ${shopName}. Thông tin: ${config?.product_info}. FAQ: ${config?.faq}. Khách hỏi: ${message}`;

    // Danh sách model để "Dò tìm"
    const MODELS = ['gemini-1.5-flash', 'gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-pro'];
    let finalResponse = null;
    let lastError = '';

    for (const model of MODELS) {
      try {
        const apiURL = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          finalResponse = data.candidates[0].content.parts[0].text;
          break; // Tìm thấy model chạy được, thoát vòng lặp
        } else {
          lastError = data.error?.message || response.statusText;
          console.log(`Model ${model} thất bại: ${lastError}`);
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!finalResponse) {
      return NextResponse.json({ error: `Tất cả model đều báo lỗi 404 hoặc lỗi Quota. Lỗi cuối: ${lastError}` }, { status: 500 });
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
