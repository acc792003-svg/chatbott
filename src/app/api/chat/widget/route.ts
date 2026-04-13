import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, history = [], code } = await req.json();

    if (!message || !code) {
      return NextResponse.json({ error: 'Missing message or shop code' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // 1. Tìm shop theo code
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, name, expiry_date')
      .eq('code', code)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Mã cửa hàng không tồn tại' }, { status: 404 });
    }

    // 2. Kiểm tra hạn sử dụng
    if (shop.expiry_date && new Date(shop.expiry_date) < new Date()) {
      return NextResponse.json({ error: 'Chatbot của shop này đã hết hạn. Vui lòng liên hệ quản lý.' }, { status: 403 });
    }

    // 3. Lấy cấu hình chatbot
    const { data: config } = await supabaseAdmin
      .from('chatbot_configs')
      .select('shop_name, product_info, faq')
      .eq('shop_id', shop.id)
      .single();

    const shopName    = config?.shop_name || 'Cửa hàng';
    const productInfo = config?.product_info || '';
    const faq         = config?.faq || '';

    const systemInstruction = `Bạn là trợ lý AI shop ${shopName}. Trả lời ngắn gọn dựa trên: ${productInfo}. FAQ: ${faq}.`;

    // 4. Khởi tạo với API Version v1 (Chính thức) thay vì v1beta
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Ép kiểu để sử dụng model gemini-1.5-flash trên bản v1
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction 
    });

    const chat = model.startChat({
      history: history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText, shop_name: shopName });

  } catch (error: any) {
    console.error('[Widget] API Error:', error);
    // Nếu vẫn lỗi 404, có thể do Model Name ở bản v1 khác
    return NextResponse.json({ error: `Lỗi: ${error.message}` }, { status: 500 });
  }
}
