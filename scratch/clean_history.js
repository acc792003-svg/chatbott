const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanHistory() {
    console.log('Cleaning polluted history for 70WPN...');
    const shopId = 'b6d7c606-ab54-4937-adf3-02d274287dc1'; // 70WPN

    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('shop_id', shopId);

    if (error) {
        console.error('Error cleaning history:', error);
    } else {
        console.log('History cleaned successfully. AI will now have a fresh context.');
    }
}

cleanHistory();
