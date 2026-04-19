import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { batchGenerateEmbeddings } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shop_id, faqs } = body;

    // 1. Validate Input
    if (!supabaseAdmin) return NextResponse.json({ error: 'Lỗi kết nối CSDL' }, { status: 500 });
    if (!shop_id || !Array.isArray(faqs) || faqs.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp shop_id và danh sách faqs hợp lệ' }, { status: 400 });
    }

    // Kiểm tra xem shop này có phải Pro để dùng Key VIP không
    const { data: shop } = await supabaseAdmin.from('shops').select('plan, plan_expiry_date').eq('id', shop_id).single();
    let isPro = false;
    if (shop?.plan === 'pro' && shop.plan_expiry_date) {
        if (new Date(shop.plan_expiry_date) > new Date()) isPro = true;
    }

    // Lọc ra các câu hỏi hợp lệ và chuyển về chữ thường để tránh duplicate do hoa/thường
    const validFaqs = faqs
      .filter((f: any) => f.question && f.answer)
      .map((f: any) => ({
        question: f.question.trim().toLowerCase(),
        answer: f.answer.trim(),
        type: f.type || 'info'
      }));

    if (validFaqs.length === 0) {
      return NextResponse.json({ error: 'Không có FAQ nào hợp lệ' }, { status: 400 });
    }

    // 2. Tránh Duplicate: Lấy danh sách question hiện có của shop
    const { data: existingFaqs } = await supabaseAdmin
      .from('faqs')
      .select('question')
      .eq('shop_id', shop_id);

    const existingQuestions = new Set((existingFaqs || []).map(f => f.question.toLowerCase().trim()));
    
    // Lọc ra những FAQ thực sự mới
    const newFaqsToInsert = validFaqs.filter(f => !existingQuestions.has(f.question));

    if (newFaqsToInsert.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'Tất cả FAQ đều đã tồn tại trước đó' });
    }

    // 3. BATCH GENERATE EMBEDDINGS (Chia nhỏ mỗi lô 20 câu để tránh Rate Limit API)
    const BATCH_SIZE = 20;
    const finalRowsToInsert = [];

    for (let i = 0; i < newFaqsToInsert.length; i += BATCH_SIZE) {
      const batch = newFaqsToInsert.slice(i, i + BATCH_SIZE);
      const textsToEmbed = batch.map(f => `Q: ${f.question}\nA: ${f.answer}`);
      
      try {
        // Gọi hàm batch API Gemini
        const embeddings = await batchGenerateEmbeddings(textsToEmbed, isPro);
        
        for (let j = 0; j < batch.length; j++) {
            if (embeddings[j]) {
                finalRowsToInsert.push({
                    shop_id: shop_id,
                    question: batch[j].question,
                    answer: batch[j].answer,
                    embedding: embeddings[j],
                    type: batch[j].type
                });
            }
        }
      } catch (embedError) {
        console.error(`Lỗi Embed batch ${i} tới ${i+BATCH_SIZE}:`, embedError);
        // Ngưng quá trình nếu lô này lỗi để tránh insert thiếu data
        throw embedError;
      }
    }

    if (finalRowsToInsert.length === 0) {
       return NextResponse.json({ error: 'Không tạo được embedding nào' }, { status: 500 });
    }

    // 4. INSERT BATCH VÀO DATABASE (Chỉ thực hiện đúng 1 lần Insert)
    const { error: insertError } = await supabaseAdmin
      .from('faqs')
      .insert(finalRowsToInsert);

    if (insertError) throw insertError;

    return NextResponse.json({ 
        success: true, 
        count: finalRowsToInsert.length,
        message: `Đã nhúng (embed) và lưu thành công ${finalRowsToInsert.length} kiến thức`
    });

  } catch (error: any) {
    console.error('Bulk Add FAQ Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
