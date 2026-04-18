import { supabaseAdmin } from '../src/lib/supabase';

async function deepAuditConfig(shopCode: string) {
  console.log(`--- TỔNG KIỂM TRA CHÉO SHOP: ${shopCode} ---`);
  
  const client = supabaseAdmin;
  if (!client) return;

  // 1. Tìm Shop trong bảng shops
  const { data: shop, error: shopErr } = await client.from('shops').select('id, name').eq('code', shopCode).maybeSingle();
  if (shopErr) console.error('Lỗi truy vấn shops:', shopErr.message);
  
  if (!shop) {
    console.error(`❌ KHÔNG TÌM THẤY mã shop '${shopCode}' trong bảng shops.`);
    return;
  }
  console.log(`✅ Tìm thấy Shop: ${shop.name} | ID: ${shop.id}`);

  // 2. Tìm cấu hình trong bảng chatbot_configs bằng shop.id
  const { data: config, error: configErr } = await client.from('chatbot_configs').select('*').eq('shop_id', shop.id).maybeSingle();
  if (configErr) console.error('Lỗi truy vấn chatbot_configs:', configErr.message);

  if (config) {
    console.log(`✅ Cấu hình TỒN TẠI trong Database cho Shop này.`);
    console.log(`- Shop Name: ${config.shop_name}`);
    console.log(`- Product Info Length: ${config.product_info?.length || 0} ký tự.`);
  } else {
    console.error(`❌ CẢNH BÁO: Bảng chatbot_configs THỰC SỰ KHÔNG CÓ dữ liệu cho shop_id này.`);
    
    // Kiểm tra xem có bản ghi nào bị "lạc" không (lấy 5 bản ghi ngẫu nhiên để xem shop_id có khớp không)
    const { data: anyConfigs } = await client.from('chatbot_configs').select('shop_id, shop_name').limit(5);
    console.log('Một số shop_id đang có trong bảng chatbot_configs để tham chiếu:');
    anyConfigs?.forEach(c => console.log(`- ${c.shop_name}: ${c.shop_id}`));
  }
}

deepAuditConfig('68XCS');
