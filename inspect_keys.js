const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function inspectKeys() {
  console.log("--- SYSTEM KEYS STATUS ---");
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .filter('key', 'like', '%api_key%');
    
  if (error) {
    console.error("Error fetching system_settings:", error);
    return;
  }

  data.forEach(item => {
    console.log(`KEY: ${item.key}`);
    console.log(`  Value (masked): ${item.value ? item.value.substring(0, 10) + '...' : 'EMPTY'}`);
    console.log(`  Status: ${item.status}`);
    console.log(`  Fail Count: ${item.fail_count}`);
    console.log(`  Last Error: ${item.last_error}`);
    console.log(`  Cooldown: ${item.cooldown_until}`);
    console.log('------------------');
  });
}

inspectKeys();
