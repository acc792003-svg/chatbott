import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { message, shopConfig } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 500 });
    }

    if (!shopConfig) {
      return NextResponse.json({ error: 'Missing shop configuration' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const systemInstruction = `
      Bạn là một nhân viên bán hàng chuyên nghiệp, thân thiện và thuyết phục.
      Sử dụng thông tin cửa hàng sau để trả lời khách hàng:
      Tên shop: ${shopConfig.shop_name}
      Sản phẩm & Giá: ${shopConfig.product_info}
      Chính sách & FAQ: ${shopConfig.faq}

      Yêu cầu:
      - Trả lời bằng tiếng Việt.
      - Câu trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề.
      - Giọng văn nhiệt tình, hỗ trợ khách hết mình.
    `;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(message);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
