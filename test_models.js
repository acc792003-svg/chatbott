const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function testModernModel() {
  const { data: keyObj } = await supabase.from('system_settings').select('*').eq('key', 'gemini_api_key_1').single();
  const key = keyObj.value;
  
  const modelsToTest = ['gemini-1.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  
  for (const model of modelsToTest) {
    console.log(`Testing model: ${model}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ ${model} works!`);
      } else {
        console.error(`❌ ${model} failed: ${data.error?.message}`);
      }
    } catch (e) {
      console.error(`❌ ${model} error: ${e.message}`);
    }
  }
}

testModernModel();
