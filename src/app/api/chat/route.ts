import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, shopConfig } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 500 });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const prompt = `
      Bạn là một nhân viên bán hàng chuyên nghiệp, thân thiện và thuyết phục.
      Sử dụng thông tin cửa hàng sau để trả lời khách hàng:
      Tên shop: ${shopConfig.shop_name}
      Sản phẩm & Giá: ${shopConfig.product_info}
      Chính sách & FAQ: ${shopConfig.faq}

      Yêu cầu:
      - Trả lời bằng tiếng Việt.
      - Câu trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề.
      - Giọng văn nhiệt tình, hỗ trợ khách hết mình.

      Tin nhắn khách hàng: "${message}"
      Trả lời ngay:
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: `Gemini API Lỗi: ${data.error.message}` }, { status: 500 });
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi không thể tạo câu trả lời lúc này.";

    return NextResponse.json({ response: aiResponse.trim() });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
