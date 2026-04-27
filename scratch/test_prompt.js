const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulate() {
    const shopId = 'b6d7c606-ab54-4937-adf3-02d274287dc1'; // 70WPN

    const { data: shopConfig } = await supabase
        .from('chatbot_configs')
        .select('*')
        .eq('shop_id', shopId)
        .single();

    const basePrompt = `Bạn là nhân viên CSKH của "${shopConfig?.shop_name || 'Shop'}".
Giọng điệu: "${shopConfig?.brand_voice || 'Nhẹ nhàng, lễ phép'}"
Chiến lược & Luật: "${shopConfig?.customer_insights || ''}"

[DATA]
${(shopConfig?.product_info || '').substring(0, 1200)}
${(shopConfig?.pricing_info || '').substring(0, 500)}
[/DATA]
HƯỚNG DẪN XỬ LÝ (QUAN TRỌNG):
1. ƯU TIÊN 1: LUÔN cố gắng tìm thông tin trong [DATA] để trả lời.
2. ƯU TIÊN 2: NẾU câu hỏi của khách hàng KHÔNG CÓ trong [DATA] (Ví dụ: cách nấu, mẹo vặt, chitchat, hoặc hỏi đáp chung): BẮT BUỘC dùng kiến thức chuyên gia của AI để giải quyết và trả lời NGẮN GỌN, ĐÚNG TRỌNG TÂM câu hỏi. Không được từ chối trả lời.
(Lưu ý duy nhất: Tuyệt đối không tự bịa ra "Giá tiền" hoặc "Tên sản phẩm riêng" nếu [DATA] không có).`;

    console.log("=== FULL SYSTEM PROMPT ===");
    console.log(basePrompt);
}

simulate();
