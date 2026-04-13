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

    // 3. Lấy toàn bộ cấu hình chatbot từ chatbot_configs
    const { data: config, error: configError } = await supabaseAdmin
      .from('chatbot_configs')
      .select('shop_name, product_info, faq')
      .eq('shop_id', shop.id)
      .single();

    console.log('[Widget] shop.id:', shop.id, '| config:', config);
    if (configError) console.error('[Widget] configError:', configError.message);

    // 4. Đọc 3 trường cấu hình
    const shopName    = config?.shop_name?.trim()   || 'Cửa hàng';
    const productInfo = config?.product_info?.trim() || 'Chưa có thông tin sản phẩm.';
    const faq         = config?.faq?.trim()          || 'Chưa có câu hỏi thường gặp.';

    // 5. System instruction được xây từ 3 trường trên
    const systemInstruction = `
Bạn là trợ lý ảo AI bán hàng của cửa hàng "${shopName}".

=== TÊN CỬA HÀNG ===
${shopName}
Luôn xưng là "${shopName}" khi khách hỏi tên shop.

=== THÔNG TIN SẢN PHẨM ===
${productInfo}

=== CÂU HỎI THƯỜNG GẶP (FAQ) ===
${faq}

=== QUY TẮC TRẢ LỜI ===
1. Ngắn gọn, súc tích (tối đa 120 chữ mỗi câu trả lời).
2. Xưng "Em", "Shop" — gọi khách là "Anh/Chị" hoặc "Bạn".
3. Chỉ dùng thông tin có trong phần Sản phẩm và FAQ ở trên. KHÔNG bịa đặt.
4. Chốt sale tự nhiên, không gượng ép.
5. Khi khách hỏi tên shop/cửa hàng → trả lời ngay bằng "${shopName}".
6. TUYỆT ĐỐI không tiết lộ mã code kỹ thuật, UUID, ID nội bộ hệ thống.
    `.trim();

    // 6. Khởi tạo model Gemini với chat session (có lịch sử hội thoại)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.0-pro',
      systemInstruction,
    });

    const chat = model.startChat({
      history: history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText, shop_name: shopName });

  } catch (error: any) {
    console.error('[Widget] API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ' }, { status: 500 });
  }
}
