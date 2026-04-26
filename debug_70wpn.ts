import { supabaseAdmin } from './src/lib/supabase';

async function debugShop() {
    const code = '70WPN';
    console.log(`🔍 ĐANG KIỂM TRA SHOP: ${code}`);

    // 1. Lấy thông tin Shop
    const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('*, chatbot_configs(*)')
        .eq('code', code)
        .single();

    if (!shop) {
        console.log('❌ KHÔNG TÌM THẤY SHOP!');
        return;
    }

    console.log('--- THÔNG TIN CHUNG ---');
    console.log(`ID: ${shop.id}`);
    console.log(`Name: ${shop.name}`);
    console.log(`FB Page ID: ${shop.fb_page_id || 'TRỐNG'}`);
    console.log(`Active: ${shop.is_active}`);

    // 2. Kiểm tra Logs lỗi gần nhất
    const { data: logs } = await supabaseAdmin
        .from('api_key_logs')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n--- 5 LOGS LỖI GẦN NHẤT ---');
    if (!logs || logs.length === 0) {
        console.log('Chưa có logs lỗi cụ thể cho shop này.');
    } else {
        logs.forEach((l: any) => {
            console.log(`[${l.created_at}] [${l.status}] ${l.error_type || ''}: ${l.error_message || 'OK'}`);
        });
    }

    // 3. Kiểm tra tri thức
    const { count: faqCount } = await supabaseAdmin
        .from('faqs')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);
    
    console.log(`\nSố lượng câu hỏi tri thức: ${faqCount || 0}`);
}

debugShop();
