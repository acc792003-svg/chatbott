const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bfyjwibykbgsvburxyjv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectShop() {
    const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('code', '68XCS')
        .single();
    
    console.log('--- 🛡️ DỮ LIỆU THỰC TẾ CỦA SHOP 68XCS ---');
    console.log(JSON.stringify(shop, null, 2));
}

inspectShop();
