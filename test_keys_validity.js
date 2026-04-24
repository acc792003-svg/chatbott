const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function testKeys() {
  const { data: keys } = await supabase.from('system_settings').select('*').filter('key', 'like', '%api_key%');
  
  for (const keyObj of keys) {
    if (!keyObj.value || keyObj.value === 'EMPTY') continue;
    
    console.log(`Testing key: ${keyObj.key}...`);
    
    if (keyObj.key.includes('gemini')) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyObj.value}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
        });
        const data = await res.json();
        if (res.ok) {
          console.log(`✅ ${keyObj.key} is VALID`);
        } else {
          console.error(`❌ ${keyObj.key} FAILED: ${data.error?.message || JSON.stringify(data)}`);
        }
      } catch (e) {
        console.error(`❌ ${keyObj.key} FETCH ERROR: ${e.message}`);
      }
    } else if (keyObj.key.includes('deepseek')) {
       try {
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyObj.value}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        const data = await res.json();
        if (res.ok) {
          console.log(`✅ ${keyObj.key} is VALID`);
        } else {
          console.error(`❌ ${keyObj.key} FAILED: ${data.error?.message || JSON.stringify(data)}`);
        }
      } catch (e) {
        console.error(`❌ ${keyObj.key} FETCH ERROR: ${e.message}`);
      }
    }
  }
}

testKeys();
