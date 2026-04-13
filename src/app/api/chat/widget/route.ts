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
      // Tìm model hỗ trợ tạo nội dung
      const supportedModel = listData.models.find((m: any) => 
        m.supportedGenerationMethods.includes('generateContent') && 
        !m.name.includes('vision') // Tránh model chỉ có mắt
      );
      if (supportedModel) {
        modelToUse = supportedModel.name.split('/').pop(); // Lấy tên sau dấu /
        console.log('Phát hiện model khả dụng:', modelToUse);
      }
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
