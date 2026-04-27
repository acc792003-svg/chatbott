const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentLogs() {
    // 1. Lấy thông tin Shop 70WPN
    const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('code', '70WPN')
        .single();

    if (!shop) {
        console.log('❌ KHÔNG TÌM THẤY SHOP 70WPN!');
        return;
    }

    // 2. Lấy 5 tin nhắn gần nhất
    const { data: logs } = await supabase
        .from('chat_logs')
        .select('user_input, answer, source, latency_ms, created_at')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('--- 5 CHAT LOGS GẦN NHẤT CỦA 70WPN ---');
    if (!logs || logs.length === 0) {
        console.log('Chưa có logs mới.');
    } else {
        logs.forEach((l) => {
            console.log(`\n[${l.created_at}] [${l.source}] (${l.latency_ms}ms)`);
            console.log(`Q: ${l.user_input}`);
            console.log(`A: ${l.answer}`);
        });
    }
}

checkRecentLogs();
