const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://bfyjwibykbgsvburxyjv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU');

s.from('chatbot_configs')
 .select('*')
 .eq('shop_id', 'b6d7c606-ab54-4937-adf3-02d274287dc1')
 .single()
 .then(r => {
    if (r.error) console.error('Error:', r.error.message);
    else console.log(JSON.stringify(r.data, null, 2));
 });
