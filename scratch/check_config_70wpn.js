const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfig() {
    const { data: config } = await supabase
        .from('chatbot_configs')
        .select('*')
        .eq('shop_id', 'b6d7c606-ab54-4937-adf3-02d274287dc1')
        .single();

    console.log('--- CHATBOT CONFIG FOR 70WPN ---');
    console.log(JSON.stringify(config, null, 2));
}

checkConfig();
