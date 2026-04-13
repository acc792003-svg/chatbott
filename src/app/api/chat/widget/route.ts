import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, code } = await req.json();
    const apiKey = (process.env.GEMINI_API_KEY || '').trim(); // Trim để bỏ dấu cách thừa

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });

    // 1. DÒ TÌM MODEL: Hỏi Google xem tôi được dùng cái gì?
    const listModelsURL = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listModelsURL);
    const listData = await listResponse.json();

    let modelToUse = 'gemini-1.5-flash'; // Mặc định

    if (listData.models && listData.models.length > 0) {
      // Ưu tiên theo thứ tự: 1.5-flash -> pro -> bất kỳ cái nào khác chạy được
      const preferred = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.0-pro'];
      
      let found = null;
      for (const p of preferred) {
        if (listData.models.find((m: any) => m.name.includes(p))) {
          found = p;
          break;
        }
      }

      if (found) {
        modelToUse = found;
      } else {
        // Nếu không có cái nào trong list ưu tiên, lấy bừa 1 cái hỗ trợ generateContent nhưng không phải 2.5 (vì đang quá tải)
        const fallback = listData.models.find((m: any) => 
          m.supportedGenerationMethods.includes('generateContent') && 
          !m.name.includes('vision') &&
          !m.name.includes('2.5-flash')
        );
        if (fallback) modelToUse = fallback.name.split('/').pop();
      }
      console.log('Model được chọn sau khi lọc:', modelToUse);
    }

    // 2. Lấy thông tin shop (như cũ)
    const { data: shop } = await supabaseAdmin!.from('shops').select('id, name').eq('code', code).single();
    const { data: config } = await supabaseAdmin!.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop?.id).single();

    // 3. GỌI API VỚI MODEL ĐÃ DÒ ĐƯỢC
    const chatURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
    
    const chatResponse = await fetch(chatURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Shop: ${config?.shop_name || shop?.name}. Info: ${config?.product_info}. Hỏi: ${message}` }] }]
      })
    });

    const chatData = await chatResponse.json();
    if (!chatResponse.ok) {
        return NextResponse.json({ error: `Dò được model ${modelToUse} nhưng lỗi: ${chatData.error?.message}` }, { status: chatResponse.status });
    }

    const responseText = chatData.candidates?.[0]?.content?.parts?.[0]?.text || 'Shop chưa hiểu ý bạn.';
    return NextResponse.json({ response: responseText, shop_name: config?.shop_name || shop?.name });

  } catch (error: any) {
    return NextResponse.json({ error: `Lỗi hệ thống: ${error.message}` }, { status: 500 });
  }
}
