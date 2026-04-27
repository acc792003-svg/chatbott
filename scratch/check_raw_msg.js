const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMessages() {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('shop_id', 'b6d7c606-ab54-4937-adf3-02d274287dc1')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching logs:', error);
    } else {
        console.log('--- RAW MESSAGES TABLE ---');
        messages.forEach(m => {
             console.log(`[${m.created_at}] Q: ${m.user_message} -> A: ${m.ai_response}`);
        });
    }
}

checkMessages();
