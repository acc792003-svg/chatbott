import { supabaseAdmin } from '../src/lib/supabase';

async function auditShopKnowledge(shopCode: string) {
  console.log(`--- ĐANG KIỂM TOÁN TRI THỨC SHOP: ${shopCode} ---`);
  
  const client = supabaseAdmin;
  if (!client) return;

  // 1. Lấy thông tin Shop
  const { data: shop } = await client.from('shops').select('id, name').eq('code', shopCode).maybeSingle();
  if (!shop) {
    console.error('❌ Không tìm thấy mã shop này.');
    return;
  }
  console.log(`Shop ID: ${shop.id} (${shop.name})`);

  // 2. Kiểm tra FAQs riêng của Shop
  const { count: faqCount } = await client.from('faqs').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id);
  console.log(`- FAQs riêng lẻ: ${faqCount || 0} câu.`);

  // 3. Kiểm tra liên kết Template (Gói tri thức chung)
  const { data: templates } = await client.from('shop_templates').select('template_id, knowledge_templates(package_name)').eq('shop_id', shop.id);
  if (templates && templates.length > 0) {
    console.log(`- ĐANG SỬ DỤNG GÓI TRI THỨC CHUNG:`);
    templates.forEach((t: any) => {
      console.log(`  + [${t.knowledge_templates?.package_name || 'Vô danh'}] (ID: ${t.template_id})`);
    });
  } else {
    console.log(`- Không sử dụng gói tri thức chung nào.`);
  }

  // 4. Kiểm tra Cấu hình AI (Bản tin thô)
  const { data: config } = await client.from('chatbot_configs').select('product_info').eq('shop_id', shop.id).maybeSingle();
  console.log(`- Nội dung Cấu hình AI: ${config?.product_info ? (config.product_info.substring(0, 50) + '...') : 'Trống'}`);
}

auditShopKnowledge('68XCS');
