const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function inspectChannels() {
  console.log("--- CHANNEL CONFIGS STATUS ---");
  const { data, error } = await supabase
    .from('channel_configs')
    .select('shop_id, channel_type, provider_id, status, last_error');
    
  if (error) {
    console.error("Error:", error);
    return;
  }

  data.forEach(item => {
    console.log(`SHOP: ${item.shop_id} | TYPE: ${item.channel_type} | ID: ${item.provider_id} | STATUS: ${item.status} | ERROR: ${item.last_error}`);
  });
}

inspectChannels();
