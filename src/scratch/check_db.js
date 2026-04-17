const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfig() {
    console.log('--- 🔍 KIỂM TRA BẢNG CẤU HÌNH ---');
    
    const { data: channels, error } = await supabase
        .from('channel_configs')
        .select('*, shops(name, code)');
    
    if (error) {
        console.log('❌ LỖI: Bảng channel_configs có thể chưa tồn tại hoặc bị lỗi truy cập.');
        console.log(error.message);
    } else {
        console.log(`Tìm thấy ${channels.length} cấu hình kênh:`);
        console.table(channels.map(c => ({
            Shop: c.shops?.name,
            Code: c.shops?.code,
            Type: c.channel_type,
            ProviderID: c.provider_id,
            HasToken: !!c.access_token
        })));
    }
}

checkConfig();
