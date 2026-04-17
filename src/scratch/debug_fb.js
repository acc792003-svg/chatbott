const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    console.log('--- 🛡️ KIỂM TRA LỖI HỆ THỐNG GẦN ĐÂY ---');
    const { data: errors } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (errors && errors.length > 0) {
        errors.forEach(e => {
            console.log(`[${e.created_at}] Source: ${e.source} | Error: ${e.error_message}`);
        });
    } else {
        console.log('Không có lỗi nào được ghi nhận.');
    }

    console.log('\n--- 💬 KIỂM TRA NHẬT KÝ CHAT (SHOP 68XCS) ---');
    const { data: shop } = await supabase.from('shops').select('id, name').eq('code', '68XCS').single();
    
    if (shop) {
        console.log(`Đã tìm thấy Shop: ${shop.name} (${shop.id})`);
        const { data: logs } = await supabase
            .from('chat_logs')
            .select('*')
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (logs && logs.length > 0) {
            logs.forEach(l => {
                console.log(`[${l.created_at}] User: ${l.user_message.substring(0, 30)}... | Bot: ${l.ai_response?.substring(0, 30)}... | Latency: ${l.latency_ms}ms`);
            });
        } else {
            console.log('Không có lịch sử chat nào cho shop này.');
        }
    } else {
        console.log('❌ Không tìm thấy shop 68XCS');
    }
}

debug();
