const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function listModels() {
  const { data: keys } = await supabase.from('system_settings').select('*').eq('key', 'gemini_api_key_2').single();
  const key = keys.value;
  
  console.log(`Testing gemini_api_key_2: ${key.substring(0, 10)}...`);
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text: "Hello world" }] }
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('Embedding works! Vector length:', data.embedding.values.length);
    } else {
      console.error('Embedding Error:', data);
    }
  } catch (e) {
    console.error('Fetch Error:', e);
  }
}

listModels();
