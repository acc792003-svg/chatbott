// Script kiểm tra API Key và danh sách Model được phép dùng
// Chạy lệnh: node test-gemini.js

// Tự động đọc file .env.local
const fs = require('fs');
const path = require('path');
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
} catch(e) { /* file not found, dùng env hệ thống */ }

const API_KEY = process.env.GEMINI_API_KEY || 'NHAP_API_KEY_CUA_BAN_VAO_DAY';

async function testGemini() {
  console.log('🔍 Bước 1: Kiểm tra danh sách Model...\n');
  
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const listData = await listRes.json();
    
    if (listData.error) {
      console.error('❌ API Key KHÔNG HỢP LỆ:', listData.error.message);
      console.log('\n👉 Hãy lấy key mới tại: https://aistudio.google.com/app/apikey');
      return;
    }
    
    console.log('✅ API Key HỢP LỆ! Các model bạn được phép dùng:\n');
    const models = listData.models || [];
    models.forEach(m => {
      const methods = m.supportedGenerationMethods?.join(', ') || 'N/A';
      console.log(`  📌 ${m.name} | Methods: ${methods}`);
    });

    // Thử gọi generateContent với model đầu tiên hỗ trợ
    const generateModel = models.find(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (!generateModel) {
      console.log('\n❌ Không có model nào hỗ trợ generateContent!');
      return;
    }
    
    console.log(`\n🔍 Bước 2: Test generateContent với: ${generateModel.name}\n`);
    
    const modelId = generateModel.name.replace('models/', '');
    const chatRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Xin chào! Trả lời bằng 1 câu tiếng Việt.' }] }]
        })
      }
    );
    
    const chatData = await chatRes.json();
    
    if (chatData.error) {
      console.error('❌ generateContent lỗi:', chatData.error.message);
    } else {
      const reply = chatData.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('✅ AI trả lời thành công:', reply);
      console.log('\n🎯 Bạn nên dùng model ID này trong code:', modelId);
    }
    
  } catch (err) {
    console.error('❌ Lỗi kết nối mạng:', err.message);
  }
}

testGemini();
