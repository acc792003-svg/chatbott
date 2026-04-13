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

    const systemInstruction = `Bạn là trợ lý AI của shop ${shopName}. Trả lời ngắn gọn, thân thiện dựa trên thông tin: ${productInfo}. FAQ: ${faq}.`;

    // 4. Danh sách các model để thử (từ mới đến cũ)
    const MODELS_TO_TRY = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
      'gemini-1.0-pro'
    ];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    let responseText = '';
    let lastError = '';

    // Vòng lặp thử từng model cho đến khi thành công
    for (const modelName of MODELS_TO_TRY) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        const chat = model.startChat({
          history: history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          })),
        });
        const result = await chat.sendMessage(message);
        responseText = result.response.text();
        if (responseText) break; // Thành công thì thoát vòng lặp
      } catch (err: any) {
        console.error(`Thử model ${modelName} thất bại:`, err.message);
        lastError = err.message;
        continue; // Thử model tiếp theo
      }
    }

    if (!responseText) {
      throw new Error(`Tất cả model đều thất bại. Lỗi cuối cùng: ${lastError}`);
    }

    return NextResponse.json({ response: responseText, shop_name: shopName });

  } catch (error: any) {
    console.error('[Widget] API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
