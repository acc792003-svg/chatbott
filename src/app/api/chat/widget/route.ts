import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, code } = await req.json();

    if (!message || !code) {
      return NextResponse.json({ error: 'Missing message or shop code' }, { status: 400 });
    }

    // Lookup shop by code
    const { data: shop } = await supabase.from('shops').select('id, name, expiry_date').eq('code', code).single();
    if (!shop) {
      return NextResponse.json({ error: 'Mã cửa hàng không tồn tại' }, { status: 404 });
    }
    
    // Check expiry
    if (shop.expiry_date && new Date(shop.expiry_date) < new Date()) {
      return NextResponse.json({ error: 'Dịch vụ Chatbot của shop này đã hết hạn. Vui lòng liên hệ quản lý.' }, { status: 403 });
    }

    // Fetch config
    const { data: shopConfig } = await supabase.from('chatbot_configs').select('*').eq('shop_id', shop.id).single();

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY || ''}`;

    const prompt = `
      Bạn là trợ lý ảo AI bán hàng thông minh của cửa hàng: ${shopConfig?.shop_name || shop.name}.
      Nhiệm vụ của bạn là tư vấn, giải đáp thắc mắc và thuyết phục khách hàng mua hàng một cách lịch sự, chuyên nghiệp.
      
      THÔNG TIN SẢN PHẨM CỦA SHOP:
      ${shopConfig?.product_info || 'Đang cập nhật'}
      
      CÁC CÂU HỎI THƯỜNG GẶP (FAQ):
      ${shopConfig?.faq || 'Đang cập nhật'}
      
      QUY TẮC PHẢN HỒI:
      1. Rất ngắn gọn, súc tích (dưới 100 chữ), chia thành các đoạn nhỏ dễ đọc.
      2. Luôn xưng "Dạ", "Shop", "Em" và gọi khách là "Anh/Chị" hoặc "Bạn".
      3. KHÔNG TỰ BỊA RA THÔNG TIN SẢN PHẨM HOẶC KHUYẾN MÃI NẾU KHÔNG CÓ TRONG HƯỚNG DẪN TRÊN.
      4. Hãy chốt sale một cách khéo léo sau khi cung cấp thông tin.

      Tin nhắn khách hàng: "${message}"
      Trả lời ngay:
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const bodyData = await response.json();
    const responseText = bodyData.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi gặp chút trục trặc khi xử lý tin nhắn.";

    return NextResponse.json({ response: responseText.trim() });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}
