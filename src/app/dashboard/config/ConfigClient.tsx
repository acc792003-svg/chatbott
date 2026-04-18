'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, HelpCircle, Brain, Settings, CheckCircle, XCircle, MessageSquare, Heart, Send } from 'lucide-react';

export default function ConfigClient() {
  const [activeTab, setActiveTab] = useState<'general' | 'ai_core'>('general');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [shopId, setShopId] = useState('');
  
  // States cho Cấu hình chung
  const [shopName, setShopName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [customerInsights, setCustomerInsights] = useState('');
  const [faq, setFaq] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');

  // States cho Smart AI Core
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState({ avg_score: 0, positive: 0, total: 0 });

  useEffect(() => {
    setMounted(true);
    fetchConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'ai_core' && shopId) {
      fetchSuggestions();
      fetchActions();
    }
  }, [activeTab, shopId]);

  const [actions, setActions] = useState<any[]>([]);
  const [newAction, setNewAction] = useState({ type: 'menu', content: '', intent_binding: 'pricing' });

  const fetchActions = async () => {
     const { data } = await supabase.from('shop_actions').select('*').eq('shop_id', shopId).order('priority', { ascending: false });
     setActions(data || []);
  };

  const handleAddAction = async () => {
     if (!newAction.content) return;
     await supabase.from('shop_actions').insert([{ ...newAction, shop_id: shopId }]);
     setNewAction({ ...newAction, content: '' });
     fetchActions();
  };

  const fetchConfig = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
    if (userData?.shop_id) {
      setShopId(userData.shop_id);
      const { data: config } = await supabase.from('chatbot_configs').select('*').eq('shop_id', userData.shop_id).single();
      if (config) {
        setShopName(config.shop_name || '');
        setProductInfo(config.product_info || '');
        setCustomerInsights(config.customer_insights || '');
        setFaq(config.faq || '');
        setTelegramChatId(config.telegram_chat_id || '');
        setTelegramBotToken(config.telegram_bot_token || '');
      }
      
      const { data: fbConfig } = await supabase.from('channel_configs')
        .select('*')
        .eq('shop_id', userData.shop_id)
        .eq('channel_type', 'facebook')
        .single();
        
      if (fbConfig) {
        setFbPageId(fbConfig.provider_id || '');
        setFbAccessToken(fbConfig.access_token || '');
      }
    }
  };

  const fetchSuggestions = async () => {
    const { data } = await supabase.from('faq_suggestions').select('*').eq('shop_id', shopId).eq('status', 'pending').order('created_at', { ascending: false });
    setSuggestions(data || []);

    const { data: convs } = await supabase.from('conversations').select('satisfaction_score, sentiment').eq('shop_id', shopId);
    if (convs && convs.length > 0) {
       const sum = convs.reduce((acc: number, c: any) => acc + (c.satisfaction_score || 0), 0);
       const pos = convs.filter((c: any) => c.sentiment === 'positive').length;
       setStats({ avg_score: Math.round(sum / convs.length), positive: pos, total: convs.length });
    }
  };

  const handleApprove = async (sugg: any) => {
    setLoading(true);
    try {
      // 1. Thêm vào FAQ chính thức (Nối vào chuỗi hiện tại)
      const newFaq = faq + `\n\nQ: ${sugg.question}\nA: ${sugg.suggested_answer}`;
      await supabase.from('chatbot_configs').update({ faq: newFaq }).eq('shop_id', shopId);
      
      // 2. Cập nhật trạng thái đề xuất
      await supabase.from('faq_suggestions').update({ status: 'approved' }).eq('id', sugg.id);
      
      setFaq(newFaq);
      setSuggestions(prev => prev.filter(s => s.id !== sugg.id));
      alert('✅ Đã duyệt và đưa vào tri thức chính thức!');
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('chatbot_configs').upsert({
        shop_id: shopId,
        shop_name: shopName.trim(),
        product_info: productInfo.trim(),
        customer_insights: customerInsights.trim(),
        faq: faq.trim(),
        is_active: true,
        telegram_chat_id: telegramChatId.trim(),
        telegram_bot_token: telegramBotToken.trim()
      }, { onConflict: 'shop_id' });
      
      if (error) throw error;
      
      if (fbPageId.trim() || fbAccessToken.trim()) {
        const { error: fbError } = await supabase.from('channel_configs').upsert({
          shop_id: shopId,
          channel_type: 'facebook',
          provider_id: fbPageId.trim(),
          access_token: fbAccessToken.trim()
        }, { onConflict: 'channel_type, provider_id' });
        
        await supabase.from('shops').update({ 
            fb_page_id: fbPageId.trim(), 
            fb_page_token: fbAccessToken.trim() 
        }).eq('id', shopId);

        if (fbError && fbError.code !== '23505') throw fbError;
      }

      alert('✅ Đã lưu cấu hình thành công!');
    } catch (err: any) {
      alert('❌ Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Shop</h1>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
           <button 
             onClick={() => setActiveTab('general')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Settings size={14} /> Cấu hình chung
           </button>
           <button 
             onClick={() => setActiveTab('ai_core')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'ai_core' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Brain size={14} /> Smart AI Core
             {suggestions.length > 0 && <span className="bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center animate-pulse">{suggestions.length}</span>}
           </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Tên cửa hàng</label>
              <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-700" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Tri thức cơ bản</label>
                <textarea rows={6} value={productInfo} onChange={e => setProductInfo(e.target.value)} placeholder="Mô tả shop của bạn..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-indigo-400 mb-1.5 ml-1 flex items-center gap-1">Kịch bản Sales & Giọng điệu <span className="text-xs">✨</span></label>
                <textarea rows={6} value={customerInsights} onChange={e => setCustomerInsights(e.target.value)} placeholder="Dán luồng tư vấn tại đây..." className="w-full bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-3.5 text-sm italic" />
              </div>
            </div>

            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Kiến thức FAQ</label>
               <textarea rows={5} value={faq} onChange={e => setFaq(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-sm" />
            </div>

            <div className="pt-4 border-t border-dashed border-slate-200 space-y-6">
               <div>
                  <h3 className="text-xs font-black uppercase text-blue-600 mb-3 flex items-center gap-2">
                     <Send size={14} /> Nhận khách qua Telegram (Tùy chọn)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Telegram Chat ID</label>
                        <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-mono outline-none focus:border-blue-500" placeholder="-1001234567..." />
                     </div>
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Telegram Bot Token</label>
                        <input type="text" value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-mono outline-none focus:border-blue-500" placeholder="7123912:AAGF..." />
                     </div>
                  </div>
               </div>

               <div>
                  <h3 className="text-xs font-black uppercase text-indigo-600 mb-3 flex items-center gap-2">
                     <MessageSquare size={14} /> Tích hợp Facebook Messenger (Tùy chọn)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Facebook Page ID</label>
                        <input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-mono outline-none focus:border-indigo-500" placeholder="1083921..." />
                     </div>
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Page Access Token</label>
                        <div className="relative">
                            <input type={showToken ? "text" : "password"} value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 pr-10 text-sm font-mono outline-none focus:border-indigo-500" placeholder="EAA..." />
                            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                                {showToken ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {loading ? 'Đang cập nhật...' : 'Xác nhận Lưu cấu hình'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
           {/* Analytics Header */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2"><CheckCircle size={20} /></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Hài lòng</span>
                 <span className="text-2xl font-black text-slate-800">{stats.avg_score}/10</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-2"><Heart size={20} /></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Cảm xúc tích cực</span>
                 <span className="text-2xl font-black text-slate-800">{stats.positive}/{stats.total}</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2"><MessageSquare size={20} /></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Hội thoại</span>
                 <span className="text-2xl font-black text-slate-800">{stats.total}</span>
              </div>
           </div>

           {/* VÙNG 2: ACTION MANAGER (Công cụ chốt đơn tự động) */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Settings size={20}/></div>
                    <div>
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cấu hình Hàng động Tự động</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Gắn link/voucher vào Ý định khách hàng</p>
                    </div>
                 </div>
                 <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase">Funnel Mode ON</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
                 <select value={newAction.type} onChange={e => setNewAction({...newAction, type: e.target.value})} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-600">
                    <option value="menu">Bảng giá / Menu</option>
                    <option value="booking_link">Link đặt lịch</option>
                    <option value="coupon">Mã giảm giá</option>
                    <option value="testimonial">Lời chứng thực</option>
                 </select>
                 <select value={newAction.intent_binding} onChange={e => setNewAction({...newAction, intent_binding: e.target.value})} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-600">
                    <option value="pricing">Khi khách hỏi giá</option>
                    <option value="booking">Khi khách đặt lịch</option>
                    <option value="info">Khi khách hỏi thông tin</option>
                 </select>
                 <input 
                    type="text" 
                    placeholder="Dán Link hoặc Voucher nội dung..." 
                    value={newAction.content} 
                    onChange={e => setNewAction({...newAction, content: e.target.value})} 
                    className="md:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold focus:ring-4 focus:ring-blue-50 transition-all" 
                 />
                 <button onClick={handleAddAction} className="bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all py-3">KÍCH HOẠT ACTION</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {actions.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg">⚡</div>
                          <div className="min-w-0">
                             <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{action.type}</p>
                                <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">INTENT: {action.intent_binding}</span>
                             </div>
                             <p className="text-[11px] text-slate-400 truncate w-48 mt-1 font-mono">{action.content}</p>
                          </div>
                       </div>
                       <button onClick={async () => { if(confirm('Xóa?')) { await supabase.from('shop_actions').delete().eq('id', action.id); fetchActions(); } }} className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all">
                          <XCircle size={14}/>
                       </button>
                    </div>
                 ))}
                 {actions.length === 0 && <div className="md:col-span-2 text-center py-6 text-slate-300 italic text-[11px]">Chưa có hành động bán hàng nào được cấu hình...</div>}
              </div>
           </div>

           {/* VÙNG 3: ĐỀ XUẤT FAQ TỪ AI (EXISTING) */}
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                       <Brain className="text-indigo-600" size={20} /> Xưởng Tri Thức AI
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">AI đề xuất thông tin mới dựa trên lịch sử chat thực tế</p>
                 </div>
                 <button onClick={fetchSuggestions} className="text-[10px] font-bold text-blue-600 hover:underline">Làm mới</button>
              </div>

              {suggestions.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center opacity-40">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><HelpCircle size={32} /></div>
                   <p className="text-sm font-bold">Chưa có đề xuất mới nào</p>
                   <p className="text-xs">Khi có đủ dữ liệu chat, AI sẽ tự động đề xuất kiến thức tại đây.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {suggestions.map((s) => (
                     <div key={s.id} className="group bg-slate-50 hover:bg-indigo-50/30 p-4 rounded-2xl border border-slate-100 transition-all">
                        <div className="flex gap-4">
                           <div className="flex-1 space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                                 <span className="w-1 h-1 bg-slate-400 rounded-full"></span> Câu hỏi mới phát hiện
                              </p>
                              <p className="text-sm font-black text-slate-800 italic">"{s.question}"</p>
                              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                 <p className="text-[9px] font-bold text-indigo-400 uppercase mb-1">AI đề xuất trả lời:</p>
                                 <p className="text-xs leading-relaxed text-slate-600">{s.suggested_answer}</p>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2 justify-center">
                              <button 
                                onClick={() => handleApprove(s)}
                                className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 hover:scale-110 active:scale-95 transition-all"
                                title="Đồng ý đưa vào FAQ"
                              >
                                 <CheckCircle size={20} />
                              </button>
                              <button 
                                onClick={async () => {
                                   if(confirm('Bạn muốn từ chối tri thức này?')) {
                                      await supabase.from('faq_suggestions').update({ status: 'rejected' }).eq('id', s.id);
                                      setSuggestions(prev => prev.filter(item => item.id !== s.id));
                                   }
                                }}
                                className="w-10 h-10 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all"
                                title="Từ chối"
                              >
                                 <XCircle size={20} />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
