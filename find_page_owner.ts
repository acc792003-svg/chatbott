
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Nạp .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function findPage() {
    console.log('--- ĐANG TRUY VÀNG DỮ LIỆU ---');
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
        
        // Kiểm tra thêm ở bảng shops (trường hợp dữ liệu cũ chưa migrate)
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
