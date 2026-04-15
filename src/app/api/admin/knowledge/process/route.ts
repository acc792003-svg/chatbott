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
      BẠN LÀ MỘT CHUYÊN GIA BIÊN TẬP TRI THỨC AI CAO CẤP.
      NHIỆM VỤ: Chắt lọc dữ liệu thô dưới đây thành cấu hình tri thức sạch cho chatbot.
      GIỌNG VĂN YÊU CẦU: ${voice}

      DỮ LIỆU THÔ:
      "${content}"

      YÊU CẦU ĐẦU RA (TRẢ VỀ ĐỊNH DẠNG JSON CHÍNH XÁC):
      {
        "product_info": "Đoạn mô tả ngắn gọn, tinh túy từ 5-10 dòng. Viết thật tình cảm và cuốn hút.",
        "faq": "Danh sách các câu hỏi thường gặp và câu trả lời theo phong cách tâm sự. Định dạng: Q: ... A: ...",
        "insights": "Phân tích 3 điểm tâm lý lớn nhất khách hàng lo lắng khi mua sản phẩm này và cách bot nên níu kéo khách."
      }

      LƯU Ý: Không thêm bất kỳ văn bản nào ngoài JSON. Trả về đúng cấu trúc trên.
    `;

    const contents = [{ role: 'user', parts: [{ text: superPrompt }] }];
    
    const aiResponse = await callGeminiWithFallback(contents, {
      temperature: 0.8,
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
    } catch (e) {
      console.error('Lỗi parse JSON từ AI:', aiResponse);
      return NextResponse.json({ 
        error: 'AI trả về định dạng không đúng hoặc bị nghẽn. Bạn hãy thử nhấn nút lại lần nữa nhé!',
        raw: aiResponse 
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
