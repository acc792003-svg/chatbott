import { NextResponse } from 'next/server';
import { callGeminiWithFallback } from '@/lib/gemini';
import { detectAndSaveLead } from '@/lib/leads';

export async function POST(req: Request) {
  try {
    const { message, shopConfig, history, shopId, sessionId } = await req.json();

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    let config = shopConfig;

    // Nếu shopConfig trống (VD: Shop dùng thử mới tạo), lấy mặc định từ shop mẫu
    if (!config || (!config.product_info && !config.faq)) {
      const { supabase, supabaseAdmin } = await import('@/lib/supabase');
      const client = supabaseAdmin || supabase;
      if (client) {
        const { data: st } = await client.from('system_settings').select('value').eq('key', 'trial_template_shop_code').single();
        const templateCode = st?.value || '70WPN';

        const { data: sourceShop } = await client.from('shops').select('id').eq('code', templateCode).single();
        if (sourceShop) {
          const { data: sourceConfig } = await client.from('chatbot_configs').select('*').eq('shop_id', sourceShop.id).single();
          if (sourceConfig) config = sourceConfig;
        }
      }
    }

    // 🔥 Bước 1: Phát hiện và lưu Lead (Số điện thoại) nếu có
    if (message && shopId) {
       await detectAndSaveLead(message, shopId, sessionId || 'unknown', config).catch(err => {
          console.error('Lead detection error:', err);
       });
    }

    const systemInstruction = `Hôm nay là ${now}. Bạn là trợ lý AI thân thiện của cửa hàng "${config?.shop_name || 'Shop'}". 
Thông tin sản phẩm: ${config?.product_info || 'Chưa cập nhật'}.
FAQ: ${config?.faq || 'Chưa cập nhật'}.
Hãy trả lời tự nhiên, thân thiện, nhớ ngữ cảnh cuộc trò chuyện. Hãy dùng thêm các icon (emoji) dễ thương vào câu trả lời để tạo sự thân thiện. 
Đặc biệt: Nếu khách hàng để lại số điện thoại hoặc yêu cầu tư vấn trực tiếp, hãy cảm ơn và hứa sẽ có nhân viên liên hệ lại sớm nhất.`;

    let contents: any[] = [];

    if (history && history.length > 0) {
      contents = history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts || [{ text: m.content || '' }]
      }));
    } else {
      contents = [{ role: 'user', parts: [{ text: message }] }];
    }

    if (contents.length > 0 && contents[0].role === 'model') {
      contents = contents.slice(1);
    }
    
    if (contents.length > 0 && contents[0].role === 'user') {
      const originalText = contents[0].parts[0]?.text || '';
      contents[0] = {
        role: 'user',
        parts: [{ text: `[Hệ thống: ${systemInstruction}]\n\nKhách hàng: ${originalText}` }]
      };
    }

    const responseText = await callGeminiWithFallback(contents, undefined, shopId || null, 'API_GENERIC_CHAT');

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
