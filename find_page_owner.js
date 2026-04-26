
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Đọc file .env.local thủ công
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Thiếu cấu hình Supabase trong .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function findPage() {
    console.log('--- ĐANG TRUY VẤN DỮ LIỆU (JS) ---');
    const { data, error } = await supabaseAdmin
        .from('channel_configs')
        .select('shop_id, provider_id, shops(name, code)')
        .eq('provider_id', '113152693799499')
        .maybeSingle();

    if (error) {
        console.error('Lỗi truy vấn:', error.message);
        return;
    }

    if (data) {
        console.log('✅ ĐÃ TÌM THẤY!');
        console.log('Shop Name:', data.shops.name);
        console.log('Shop Code:', data.shops.code);
        console.log('Shop ID:', data.shop_id);
    } else {
        console.log('❌ Không tìm thấy Page ID này trong bảng channel_configs.');
        
        const { data: shopData } = await supabaseAdmin
            .from('shops')
            .select('name, code, id')
            .eq('fb_page_id', '113152693799499')
            .maybeSingle();
            
        if (shopData) {
            console.log('✅ Tìm thấy trong bảng shops (Dữ liệu cũ):');
            console.log('Shop Name:', shopData.name);
            console.log('Shop Code:', shopData.code);
        } else {
            console.log('Dữ liệu hoàn toàn sạch trong hệ thống.');
        }
    }
}

findPage();
