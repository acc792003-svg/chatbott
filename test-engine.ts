const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const tsNode = require('ts-node');
tsNode.register({ transpileOnly: true });

const { processChat } = require('./src/lib/chatbot-engine.ts');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: shop } = await supabase.from('shops').select('id').eq('code', '68XCS').single();
  console.log('Testing for shop id:', shop.id);
  const result = await processChat({
     shopId: shop.id,
     message: 'Hello, có chỗ đậu ô tô không?',
     externalUserId: 'test-user',
     platform: 'widget',
     isPro: true
  });
  console.log('FINAL RESULT:', result);
}

test().catch(console.error);
