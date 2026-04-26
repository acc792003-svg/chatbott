
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function clean() {
    console.log('--- ĐANG GIẢI PHÓNG PAGE ID ---');
    
    // 1. Xóa trong channel_configs
    const { error: err1 } = await supabaseAdmin
        .from('channel_configs')
        .delete()
        .eq('provider_id', '113152693799499');

    // 2. Xóa nốt trong shops nếu còn (fb_page_id)
    const { error: err2 } = await supabaseAdmin
        .from('shops')
        .update({ fb_page_id: null, fb_page_token: null })
        .eq('fb_page_id', '113152693799499');

    if (err1 || err2) {
        console.error('Lỗi khi xóa:', err1?.message || err2?.message);
    } else {
        console.log('✅ THÀNH CÔNG: Page ID 113152693799499 đã được gỡ bỏ hoàn toàn khỏi hệ thống.');
    }
}

clean();
