const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function inspectFBKeys() {
  console.log("--- FACEBOOK KEYS STATUS ---");
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .in('key', ['fb_app_secret', 'fb_verify_token']);
    
  if (error) {
    console.error("Error:", error);
    return;
  }

  data.forEach(item => {
    console.log(`KEY: ${item.key} | VALUE: ${item.value}`);
  });
}

inspectFBKeys();
