import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
  const { data, error } = await supabaseAdmin.from('chatbot_configs').upsert({
    shop_id: '1075624b-8941-418e-a0e9-ca8344379cc1',
    is_active: true
  }, { onConflict: 'shop_id' });
  console.log('Result:', { data, error });
}

test();
