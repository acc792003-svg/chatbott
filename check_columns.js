const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('channel_configs')
    .select('*')
    .limit(1);
    
  if (data && data.length > 0) {
    console.log("Columns in channel_configs:", Object.keys(data[0]));
  } else {
    console.log("No data in channel_configs or error:", error);
  }
}

checkColumns();
