import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, shopConfig } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });

    const apiURL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Cửa hàng: ${shopConfig?.shop_name}. Sản phẩm: ${shopConfig?.product_info}. FAQ: ${shopConfig?.faq}. Khách: ${message}`;

    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Google API Error' }, { status: response.status });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
