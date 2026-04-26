const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://bfyjwibykbgsvburxyjv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU');

async function checkEverything() {
    try {
        console.log('🔍 KIỂM TRA TỔNG THỂ HỆ THỐNG...');

        // 1. Kiểm tra API Keys Health
        const { data: keys } = await s.from('system_settings').select('key, status, fail_count, cooldown_until, value');
        console.log('\n--- TRẠNG THÁI API KEYS ---');
        keys.forEach(k => {
            if (k.key.includes('api_key')) {
                const isValueEmpty = !k.value || k.value.trim() === '';
                console.log(`${k.key}: ${k.status} | Fail: ${k.fail_count} | Empty: ${isValueEmpty} | Cooldown: ${k.cooldown_until || 'No'}`);
            }
        });

        // 2. Kiểm tra Logs lỗi AI
        console.log('\n--- 10 LOGS API GẦN NHẤT ---');
        const { data: logs } = await s.from('api_key_logs').select('*').order('created_at', { ascending: false }).limit(10);
        if (logs && logs.length > 0) {
            logs.forEach(l => {
                console.log(`[${l.created_at}] [${l.status}] ${l.provider}: ${l.error_type || ''}`);
            });
        } else {
            console.log('Bảng api_key_logs trống.');
        }

        // 3. Kiểm tra Radar Errors
        console.log('\n--- 10 RADAR ERRORS GẦN NHẤT ---');
        const { data: radar } = await s.from('error_logs').select('*').order('created_at', { ascending: false }).limit(10);
        if (radar && radar.length > 0) {
            radar.forEach(r => {
                console.log(`[${r.created_at}] [${r.error_type}] Shop: ${r.shop_id || 'Global'}: ${r.error_message}`);
            });
        } else {
            console.log('Bảng error_logs trống.');
        }

        // 4. Kiểm tra Shop 70WPN cụ thể
        console.log('\n--- KIỂM TRA SHOP 70WPN ---');
        const { data: shop } = await s.from('shops').select('id, name, fb_page_id').eq('code', '70WPN').single();
        if (shop) {
            const { data: chatLogs } = await s.from('chat_logs').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(5);
            console.log('5 cuộc chat gần nhất của shop:');
            chatLogs?.forEach(cl => {
                console.log(`[${cl.created_at}] Q: ${cl.user_input.substring(0,20)}... | Answer: ${cl.answer.substring(0,20)}... | Source: ${cl.source}`);
            });
        }

    } catch (e) {
        console.error('LỖI KHI KIỂM TRA:', e.message);
    }
}
checkEverything();
