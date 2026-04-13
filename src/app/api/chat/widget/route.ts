import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, history = [], code } = await req.json();
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    const { data: config } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop?.id).single();
    
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const prompt = `Hôm nay là ${now}. Bạn là trợ lý cho ${shopName}. Thông tin: ${config?.product_info}. FAQ: ${config?.faq}. Khách hỏi: ${message}`;

    // 1. DÒ TÌM DANH SÁCH MODEL KHẢ DỤNG
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listResponse.json();
    
    let candidates: string[] = [];
    if (listData.models) {
      candidates = listData.models
        .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name); // Lấy tên đầy đủ: 'models/gemini-1.5-flash'
    }

    // Nếu không dò được, dùng list mặc định
    if (candidates.length === 0) {
      candidates = ['models/gemini-1.5-flash', 'models/gemini-pro', 'models/gemini-1.0-pro'];
    }

    // Ưu tiên né 2.5-flash nếu có thể vì đang overload
    candidates.sort((a, b) => {
      if (a.includes('2.5-flash')) return 1;
      if (b.includes('2.5-flash')) return -1;
      return 0;
    });

    let finalResponse = null;
    let lastError = '';

    // 2. THỬ TỪNG MODEL VỚI CẢ V1 VÀ V1BETA
    for (const fullModelName of candidates) {
       for (const version of ['v1', 'v1beta']) {
          try {
            const apiURL = `https://generativelanguage.googleapis.com/${version}/${fullModelName}:generateContent?key=${apiKey}`;
            const response = await fetch(apiURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              finalResponse = data.candidates[0].content.parts[0].text;
              break;
            } else {
              lastError = data.error?.message || 'Unknown error';
            }
          } catch (e: any) {
            lastError = e.message;
          }
       }
       if (finalResponse) break;
    }

    if (!finalResponse) {
      return NextResponse.json({ error: `Không có model nào phản hồi. Lỗi cuối: ${lastError}` }, { status: 500 });
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
