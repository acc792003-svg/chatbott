import { supabaseAdmin } from '../src/lib/supabase';

async function verifyTables() {
  console.log('--- KIỂM TRA CẤU TRÚC BẢNG RADAR ---');
  
  const client = supabaseAdmin;
  if (!client) {
    console.error('❌ supabaseAdmin null');
    return;
  }

  // Thử insert vào system_errors
  console.log('Đang thử insert vào system_errors...');
  const { error: err1 } = await client.from('system_errors').insert({ error_type: 'CHECK' }).limit(1);
  if (err1) {
    console.error('❌ system_errors ERROR:', err1.message);
    if (err1.message.includes('does not exist')) {
        console.log('👉 XÁC NHẬN: Bảng system_errors CHƯA TỒN TẠI.');
    }
  } else {
    console.log('✅ Bảng system_errors TỒN TẠI.');
  }

  // Thử insert vào error_logs
  console.log('Đang thử insert vào error_logs...');
  const { error: err2 } = await client.from('error_logs').insert({ error_type: 'CHECK' }).limit(1);
  if (err2) {
    console.error('❌ error_logs ERROR:', err2.message);
  } else {
    console.log('✅ Bảng error_logs TỒN TẠI.');
  }
}

verifyTables();
