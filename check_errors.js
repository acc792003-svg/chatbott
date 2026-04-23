const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function checkErrors() {
  console.log("--- SYSTEM ERRORS (Chatbot Radar) ---");
  const { data, error } = await supabase
    .from('system_errors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error("Error fetching system_errors:", error);
  } else {
    data.forEach(err => {
      console.log(`[${err.created_at}] TYPE: ${err.error_type} | MSG: ${err.error_message} | SHOP: ${err.shop_id}`);
    });
  }
}

checkErrors();
