const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConfig() {
  const { data: shop } = await supabase.from('shops').select('id, code').eq('code', '68XCS').single();
  const { data: config } = await supabase.from('chatbot_configs').select('*').eq('shop_id', shop.id).maybeSingle();
  
  if (!config) {
     console.log('No config found! Inserting baseline config...');
     await supabase.from('chatbot_configs').insert({
        shop_id: shop.id,
        shop_name: 'QLady Spa (' + shop.code + ')',
        product_info: 'Spa làm đẹp',
        pricing_info: '',
        customer_insights: '',
        brand_voice: 'Dạ, vâng',
        faq: '',
        is_active: true
     });
     console.log('Baseline config inserted.');
  } else {
     console.log('Config exists:', config.shop_name);
  }
}
checkConfig().catch(console.error);
