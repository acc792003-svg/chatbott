import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { industryName, packageName, faqList, requesterId } = await req.json();

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });

    // 1. Kiểm tra quyền Super Admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!faqList || !Array.isArray(faqList) || faqList.length === 0) {
      return NextResponse.json({ error: 'Danh sách FAQ trống!' }, { status: 400 });
    }

    // 2. Tạo hoặc cập nhật Knowledge Template (Lưu JSON)
    const { data: template, error: templateError } = await supabaseAdmin
      .from('knowledge_templates')
      .insert({
        industry_name: industryName,
        package_name: packageName,
        faq_json: faqList,
        // Các trường cũ để tương thích ngược nếu cần
        product_info: 'Gói tri thức Vector Search',
        faq: faqList.map((f: any) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // 3. Xử lý Embedding cho từng câu hỏi và lưu vào bảng knowledge_items
    const processItems = async () => {
      for (const item of faqList) {
        if (!item.q || !item.a) continue;
        
        try {
          // Tạo vector cho câu hỏi kèm theo NGỮ CẢNH sử dụng API Key PRO
          const contextText = `${industryName} | ${packageName} | ${item.q}`;
          const embedding = await generateEmbedding(contextText, true);
          
          await supabaseAdmin.from('knowledge_items').insert({
            template_id: template.id,
            question: item.q,
            answer: item.a,
            embedding: embedding
          });
        } catch (err: any) {
          console.error(`Lỗi tạo embedding cho câu: ${item.q}`, err);
          // Ghi log lỗi nhưng tiếp tục câu tiếp theo
          await supabaseAdmin.from('error_logs').insert({
            error_type: 'EMBEDDING_ERROR',
            error_message: `Câu hỏi: ${item.q} - ${err.message || 'Lỗi không xác định'}`,
            source: 'API_KNOWLEDGE_PROCESS'
          });
        }
      }
    };

    // Chạy ngầm việc tạo embedding để không treo request (hoặc đợi nếu ít)
    if (faqList.length <= 10) {
        await processItems();
    } else {
        processItems(); // Chạy background cho danh sách dài
    }

    return NextResponse.json({ 
        success: true, 
        message: 'Đã nhận tri thức và đang tiến hành mã hóa Vector...',
        templateId: template.id 
    });

  } catch (error: any) {
    console.error('Knowledge Process Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
