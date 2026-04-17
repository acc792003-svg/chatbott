const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceFix() {
    console.log('--- 🛠️ PHỤC HỒI HỆ THẦN KINH SHOP 68XCS ---');
    
    // 1. Tìm shop ID
    const { data: shop } = await supabase.from('shops').select('id, fb_page_id, fb_page_token').eq('code', '68XCS').single();
    
    if (!shop) {
        console.log('❌ Không tìm thấy shop 68XCS!');
        return;
    }

    // 2. Kiểm tra xem dữ liệu có trong shops không
    console.log(`Dữ liệu hiện tại trong shops: ID=${shop.fb_page_id}, Token=${shop.fb_page_token ? 'Đã có' : 'Trống'}`);

    if (shop.fb_page_id) {
        console.log('🔄 Đang ép dữ liệu vào bảng channel_configs...');
        const { error } = await supabase.from('channel_configs').upsert({
            shop_id: shop.id,
            channel_type: 'facebook',
            provider_id: shop.fb_page_id.trim(),
            access_token: shop.fb_page_token?.trim()
        });

        if (error) {
            console.log(`❌ Lỗi ép dữ liệu: ${error.message}`);
            console.log('⚠️ Có thể bảng channel_configs chưa được tạo hoặc thiếu cột.');
        } else {
            console.log('✅ ĐÃ KÍCH HOẠT CẤU HÌNH THÀNH CÔNG!');
        }
    } else {
        console.log('❌ Shop 68XCS chưa có Page ID. Vui lòng nhập Page ID trong dashboard.');
    }
}

forceFix();
