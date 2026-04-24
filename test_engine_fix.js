// Force env variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bfyjwibykbgsvburxyjv.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5Mzg1MjYsImV4cCI6MjA5MTUxNDUyNn0.aIBidYS_OVeLhElYg-6R59oEPuUdEOU2YJmAG7TaXcc';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeWp3aWJ5a2Jnc3ZidXJ4eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzODUyNiwiZXhwIjoyMDkxNTE0NTI2fQ.tedLICtrZWxHwe_x0_Ue6uIYJXc2cweAvuwAN9C8yXU';
process.env.GEMINI_EMBEDDING_KEY_1 = 'AIzaSyAxSrcfDZNduuSFT5hLR3GnCscKM5FM4H4';

// Mocking @/lib/supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// We need to run this in a way that respects the project structure.
// But since I can't easily run Next.js code with imports without transpile,
// I'll just check if the models work now.

async function testEngineLogic() {
    const shopId = '1075624b-8941-418e-a0e9-ca8344379cc1';
    
    console.log("Testing Engine Logic (Step by Step)...");
    
    // 1. Test Embedding with new model
    const text = "xin chào shop";
    const key = process.env.GEMINI_EMBEDDING_KEY_1;
    console.log("Step 1: Testing Embedding...");
    const resEmb = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-2",
          content: { parts: [{ text }] }
        })
    });
    if (resEmb.ok) {
        console.log("✅ Embedding OK");
    } else {
        const err = await resEmb.json();
        console.error("❌ Embedding Failed:", err);
    }
    
    // 2. Test Chat with new model (using gemini_api_key_1 from DB)
    const { data: keyObj } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'gemini_api_key_1').single();
    const chatKey = keyObj.value;
    console.log("Step 2: Testing Chat...");
    const resChat = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${chatKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Xin chào' }] }] })
    });
    if (resChat.ok) {
        console.log("✅ Chat OK");
    } else {
        const err = await resChat.json();
        console.error("❌ Chat Failed:", err);
    }
}

testEngineLogic();
