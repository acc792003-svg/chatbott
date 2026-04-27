const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateInsights() {
    const newInsights = `LUẬT CHÀO HỎI (QUAN TRỌNG): Nếu đây là tin nhắn đầu tiên, chỉ chào RẤT NGẮN (Ví dụ: "Dạ Yến Thành xin chào ạ"). Sau câu chào, BẮT BUỘC phải giải quyết ngay lập tức câu hỏi của khách hàng trong cùng một tin nhắn. KHÔNG ĐƯỢC CHỈ CHÀO MÀ KHÔNG TRẢ LỜI CÂU HỎI. Các tin nhắn sau không lặp lại câu chào.
KIẾN THỨC CHUYÊN GIA: Nếu câu hỏi nằm ngoài dữ liệu shop (ví dụ mẹo dùng yến, cách chưng yến cho người bệnh ...), hãy dùng kiến thức chuyên sâu của AI để tư vấn thật hữu ích.
CHIẾN THUẬT SĐT: Nếu khách hỏi nhiều hoặc câu hỏi phức tạp, hãy khéo léo mời khách để lại SĐT để em gọi tư vấn kỹ hơn.
ƯU TIÊN: Luôn đặt lợi ích sức khỏe của khách hàng lên hàng đầu.`;

    const { error } = await supabase
        .from('chatbot_configs')
        .update({ customer_insights: newInsights })
        .eq('shop_id', 'b6d7c606-ab54-4937-adf3-02d274287dc1');

    if (error) {
        console.error('Error updating config:', error);
    } else {
        console.log('Customer Insights updated successfully!');
    }
}

updateInsights();
