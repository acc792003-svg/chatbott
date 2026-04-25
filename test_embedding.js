const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bfyjwibykbgsvburxyjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU'
);

async function testEmbedding() {
  // Use the key from .env.local as it's used for embedding
  const key = 'AIzaSyB5GDToRK_vPGIT4b2aVyHWu7gswr4hZ-Y'; // GEMINI_EMBEDDING_KEY_1
  
  const models = ['text-embedding-004', 'gemini-embedding-001', 'gemini-embedding-2'];
  
  for (const model of models) {
    console.log(`Testing embedding model: ${model}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: 'Hello' }] }
        })
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

testEmbedding();
