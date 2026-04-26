const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function debugShop() {
    const code = '70WPN';
    console.log(`🔍 ĐANG KIỂM TRA SHOP: ${code}`);

    const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('code', code)
        .single();

    if (!shop) {
        console.log('❌ KHÔNG TÌM THẤY SHOP!');
        return;
    }

    console.log('--- THÔNG TIN CHUNG ---');
    console.log(`ID: ${shop.id}`);
    console.log(`FB Page ID: ${shop.fb_page_id || 'TRỐNG'}`);
    console.log(`Active: ${shop.is_active}`);

    const { data: logs } = await supabaseAdmin
        .from('api_key_logs')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(15);

    console.log('\n--- 15 LOGS GẦN NHẤT CỦA SHOP ---');
    if (!logs || logs.length === 0) {
        console.log('Không có logs lỗi riêng. Kiểm tra logs hệ thống...');
    } else {
        logs.forEach(l => {
            console.log(`[${l.created_at}] [${l.status}] ${l.error_type || ''}: ${l.error_message || 'OK'}`);
        });
    }

    const { data: sysLogs } = await supabaseAdmin
        .from('api_key_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    
    console.log('\n--- 10 LOGS HỆ THỐNG GẦN NHẤT ---');
    sysLogs.forEach(l => {
        console.log(`[${l.created_at}] [${l.status}] ${l.error_type || 'INFO'}: ${l.error_message || 'OK'}`);
    });

    const { data: keys } = await supabaseAdmin.from('system_settings').select('key, status, fail_count, cooldown_until');
    console.log('\n--- TRẠNG THÁI API KEYS ---');
    keys.forEach(k => {
        if (k.key.includes('api_key')) {
            console.log(`${k.key}: ${k.status} (Fail: ${k.fail_count}) Cooldown: ${k.cooldown_until || 'No'}`);
        }
    });
}

debugShop();
