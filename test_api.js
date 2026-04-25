require('dotenv').config({ path: '.env.local' });
const { generateEmbedding } = require('./src/lib/gemini');

async function run() {
  try {
    const vector = await generateEmbedding('Xin chào');
    console.log('Embedding successful, length:', vector.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
