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
      temperature: 0.1,
      maxOutputTokens: 2000,
      response_mime_type: "application/json" // Ép AI trả về JSON chuẩn
    }, null);

    // Xử lý bóc tách JSON mạnh mẽ hơn
    let cleanedResponse = aiResponse.trim();
    
    // Loại bỏ markdown code blocks nếu có
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    }

    try {
      const result = JSON.parse(cleanedResponse);
      return NextResponse.json({ result });
    } catch (e: any) {
      // Thử tìm JSON bằng Regex nếu parse trực tiếp thất bại
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0].trim());
          return NextResponse.json({ result });
        } catch (innerError) {
           console.error('Lỗi parse JSON sâu:', aiResponse);
           return NextResponse.json({ error: 'Định dạng AI trả về không thể xử lý!', raw: aiResponse }, { status: 500 });
        }
      }
      
      // GHI LOG LỖI VÀO DB ĐỂ THEO DÕI
      if (supabaseAdmin) {
        await supabaseAdmin.from('error_logs').insert({
          error_type: 'AI_PROCESS_ERROR',
          error_message: `Định dạng lạ: ${aiResponse.substring(0, 50)}...`,
          source: 'API_KNOWLEDGE_PROCESS'
        });
      }
      return NextResponse.json({ error: `Định dạng lạ: ${aiResponse.substring(0, 50)}...` }, { status: 500 });
    }

  } catch (error: any) {
    // GHI LOG LỖI VÀO DB ĐỂ THEO DÕI
    if (supabaseAdmin) {
      await supabaseAdmin.from('error_logs').insert({
        error_type: 'AI_PROCESS_ERROR',
        error_message: error.message || 'Lỗi bóc tách JSON',
        source: 'API_KNOWLEDGE_PROCESS'
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
