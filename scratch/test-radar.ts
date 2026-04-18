import { supabaseAdmin } from '../src/lib/supabase';

async function testRadar() {
  console.log('--- ĐANG KIỂM TRA KẾT NỐI RADAR ---');
  
  if (!supabaseAdmin) {
    console.error('❌ LỖI: supabaseAdmin đang bị NULL. Hãy kiểm tra SUPABASE_SERVICE_ROLE_KEY trong .env');
    return;
  }

  console.log('✅ supabaseAdmin định nghĩa thành công.');

  try {
    const { data, error } = await supabaseAdmin.from('system_errors').insert({
      error_type: 'RADAR_TEST',
      error_message: 'Đây là tin nhắn kiểm tra kết nối Radar lúc ' + new Date().toISOString(),
      file_source: 'test-radar-script.ts',
      metadata: { test: true }
    }).select();

    if (error) {
      console.error('❌ LỖI KHI GHI VÀO DB:', error.message);
    } else {
      console.log('🚀 THÀNH CÔNG! Đã ghi log mẫu vào Radar.');
      console.log('Dữ liệu trả về:', data);
    }
  } catch (e: any) {
    console.error('❌ LỖI NGOẠI LỆ:', e.message);
  }
}

testRadar();
