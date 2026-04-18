const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking chatbot_configs...');
    const { data: config, error } = await supabase.from('chatbot_configs').select('*').limit(1);
    if (error) console.error('Error fetching chatbot_configs:', error);
    else console.log('chatbot_configs columns:', Object.keys(config[0] || {}));

    console.log('\nChecking shops...');
    const { data: shop, error: shopError } = await supabase.from('shops').select('*').limit(1);
    if (shopError) console.error('Error fetching shops:', shopError);
    else console.log('shops columns:', Object.keys(shop[0] || {}));

    console.log('\nChecking channel_configs...');
    const { data: channel, error: channelError } = await supabase.from('channel_configs').select('*').limit(1);
    if (channelError) console.error('Error fetching channel_configs:', channelError);
    else console.log('channel_configs columns:', Object.keys(channel[0] || {}));
}

checkSchema();
