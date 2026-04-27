const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugShop() {
    const code = '70WPN';
    console.log(`🔍 ĐANG KIỂM TRA SHOP: ${code}`);

    // 1. Lấy thông tin Shop
    const { data: shop } = await supabase
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
    console.log(`Plan: ${shop.plan}`);
    
    // 2. Kiểm tra Cache Answers (Nguyên nhân gây lặp tin)
    const { data: cache } = await supabase
        .from('cache_answers')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n--- CACHE ANSWERS GẦN NHẤT ---');
    if (!cache || cache.length === 0) {
        console.log('Chưa có cache.');
    } else {
        cache.forEach((c) => {
            console.log(`Q: ${c.question} \nA: ${c.answer}\n`);
        });
    }

    // 3. Kiểm tra Chat Logs Gần Nhất
    const { data: logs } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n--- 3 CHAT LOGS GẦN NHẤT ---');
    if (!logs || logs.length === 0) {
        console.log('Chưa có chat logs.');
    } else {
        logs.forEach((l) => {
            console.log(`[${l.created_at}] [${l.source}] Q: ${l.user_input} -> A: ${l.answer.substring(0, 50)}...`);
        });
    }
}

debugShop();
