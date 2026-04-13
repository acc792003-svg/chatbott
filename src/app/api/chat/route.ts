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

    // Sử dụng phiên bản v1 chính thức
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const systemInstruction = `
      Bạn là nhân viên bán hàng của ${shopConfig.shop_name}.
      Thông tin: ${shopConfig.product_info}. 
      FAQ: ${shopConfig.faq}.
      Trả lời ngắn gọn, nhiệt tình.
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
