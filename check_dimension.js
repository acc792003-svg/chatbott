const key = 'AIzaSyAxSrcfDZNduuSFT5hLR3GnCscKM5FM4H4';

async function checkDimension() {
  const model = 'gemini-embedding-2';
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
      console.log(`✅ ${model} dimension: ${data.embedding.values.length}`);
    } else {
      console.error(`❌ ${model} failed: ${data.error?.message}`);
    }
  } catch (e) {
    console.error(`❌ error: ${e.message}`);
  }
}

checkDimension();
