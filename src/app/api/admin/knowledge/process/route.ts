import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { content, voice, requesterId } = await req.json();

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });

    // Kiểm tra quyền Super Admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const superPrompt = `
      Nhiệm vụ: Chuyển đổi dữ liệu thô về sản phẩm thành cấu hình chatbot.
      Giọng văn: ${voice}

      Dữ liệu cần xử lý:
      "${content}"

      BẮT BUỘC TRẢ VỀ JSON THEO ĐÚNG CẤU TRÚC SAU (KHÔNG GIẢI THÍCH THÊM):
      {
        "product_info": "Mô tả sản phẩm (5-10 dòng), giàu cảm xúc.",
        "faq": "Các câu hỏi đáp Q: ... A: ...",
        "insights": "3 điểm tâm lý khách hàng lo lắng và cách níu kéo."
      }
    `;

    const contents = [{ role: 'user', parts: [{ text: superPrompt }] }];
    
    const aiResponse = await callGeminiWithFallback(contents, {
      temperature: 0.2, // Giảm temperature để AI bám sát định dạng JSON
      maxOutputTokens: 2000
    }, null);

    // Bóc tách JSON một cách mạnh mẽ hơn bằng Regex
    let result = null;
    try {
      // Tìm đoạn bắt đầu bằng { và kết thúc bằng }
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Không tìm thấy JSON');
      }
      return NextResponse.json({ result });
    } catch (e: any) {
      console.error('Lỗi parse JSON từ AI:', aiResponse);
      const errorDetail = aiResponse ? aiResponse.substring(0, 100) : 'AI không phản hồi';
      return NextResponse.json({ 
        error: `AI trả về định dạng lạ: "${errorDetail}..."`,
        raw: aiResponse 
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
