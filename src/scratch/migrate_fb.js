const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('--- 🚚 BẮT ĐẦU CHUYỂN ĐỔI DỮ LIỆU SANG HỆ THỐNG MỚI ---');
    
    // 1. Lấy tất cả các shop có cấu hình FB cũ
    const { data: shops } = await supabase
        .from('shops')
        .select('id, name, fb_page_id, fb_page_access_token')
        .not('fb_page_id', 'is', null);
    
    if (!shops || shops.length === 0) {
        console.log('Không có dữ liệu cũ cần chuyển đổi.');
        return;
    }

    console.log(`Tìm thấy ${shops.length} shop cần chuyển đổi.`);

    for (const shop of shops) {
        if (!shop.fb_page_id) continue;

        const { error } = await supabase.from('channel_configs').upsert({
            shop_id: shop.id,
            channel_type: 'facebook',
            provider_id: shop.fb_page_id.trim(),
            access_token: shop.fb_page_access_token?.trim()
        }, { onConflict: 'channel_type, provider_id' });

        if (error) {
            console.log(`❌ Lỗi khi chuyển đổi Shop ${shop.name}: ${error.message}`);
        } else {
            console.log(`✅ Đã bọc thép thành công cho Shop: ${shop.name}`);
        }
    }

    console.log('--- 🎉 TẤT CẢ ĐÃ HOÀN TẤT! ---');
}

migrate();
