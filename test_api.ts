import { config } from 'dotenv';
config({ path: '.env.local' });
// Load supabase AFTER dotenv
import { supabaseAdmin } from './src/lib/supabase';
import { generateEmbedding, callGeminiWithFallback } from './src/lib/gemini';

async function run() {
  try {
    console.log('Testing generateEmbedding...');
    const vector = await generateEmbedding('Xin chào');
    console.log('✅ Embedding successful, length:', vector.length);

    console.log('\nTesting callGeminiWithFallback...');
    const chatResult = await callGeminiWithFallback(
      [{ role: 'user', parts: [{ text: 'Xin chào, trả lời bằng 1 câu ngắn.' }] }],
      { temperature: 0.7, isPro: false },
      null,
      'TEST'
    );
    console.log('✅ Chat successful:', chatResult.text);
    console.log('✅ Source:', chatResult.source);
    
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
}

run();
