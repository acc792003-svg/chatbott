import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, shopConfig } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const prompt = `Hôm nay là ${now}. Cửa hàng: ${shopConfig?.shop_name}. Sản phẩm: ${shopConfig?.product_info}. FAQ: ${shopConfig?.faq}. Khách: ${message}`;

    const candidates = [
      'models/gemini-2.5-flash',
      'models/gemini-1.5-flash-8b',
      'models/gemini-1.5-pro',
      'models/gemini-1.0-pro',
      'models/gemini-pro'
    ];

    let finalResponse = null;
    let lastError = '';

    for (const fullModelName of candidates) {
      for (const version of ['v1beta', 'v1']) {
        try {
          const apiURL = `https://generativelanguage.googleapis.com/${version}/${fullModelName}:generateContent?key=${apiKey}`;
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            })
          });
          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            finalResponse = data.candidates[0].content.parts[0].text;
            break;
          } else {
            lastError = data.error?.message || 'Google API Error';
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }
      if (finalResponse) break;
    }

    if (!finalResponse) {
      return NextResponse.json({ error: lastError }, { status: 503 });
    }

    return NextResponse.json({ response: finalResponse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
