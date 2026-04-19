'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, HelpCircle, Brain, Settings, CheckCircle, XCircle, MessageSquare, Heart, Send, Lock } from 'lucide-react';

export default function ConfigClient() {
  const [activeTab, setActiveTab] = useState<'general' | 'ai_core'>('general');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [shopId, setShopId] = useState('');
  
  // States cho Cấu hình chung
  const [shopName, setShopName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [pricingInfo, setPricingInfo] = useState('');
  const [customerInsights, setCustomerInsights] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [faq, setFaq] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');

  // States cho Smart AI Core
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [vectorFaqs, setVectorFaqs] = useState<any[]>([]);
  const [bulkFaqInput, setBulkFaqInput] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [stats, setStats] = useState({ avg_score: 0, positive: 0, total: 0 });


  const [actions, setActions] = useState<any[]>([]);
  const [newAction, setNewAction] = useState({ type: 'menu', content: '', intent_binding: 'pricing' });
  const [globalPackages, setGlobalPackages] = useState<any[]>([]);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  const fetchGlobalPackages = async () => {
     try {
        const res = await fetch('/api/config/global-packages', {
            method: 'POST',
            body: JSON.stringify({ shopId })
        });
        const data = await res.json();
        setGlobalPackages(data.packages || []);
     } catch (e) {
        setGlobalPackages([]);
     }
  };

  useEffect(() => {
    if (activeTab === 'ai_core' && shopId) {
      fetchSuggestions();
      fetchActions();
      fetchVectorFaqs();
      fetchGlobalPackages();
    }
  }, [activeTab, shopId]);

  const fetchVectorFaqs = async () => {
     const { data } = await supabase.from('faqs').select('id, question, answer').eq('shop_id', shopId).order('created_at', { ascending: false });
     setVectorFaqs(data || []);
  };

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

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [hasPinState, setHasPinState] = useState(false);

  const checkPinFirst = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
    if (userData?.shop_id) {
       setShopId(userData.shop_id);
       
       try {
           const res = await fetch('/api/config/check-pin', {
               method: 'POST', body: JSON.stringify({ shopId: userData.shop_id, pin: '' })
           });
           const verify = await res.json();
           if (verify.requiresPin === false) {
               // No pin required
               setIsUnlocked(true);
               fetchConfigData(userData.shop_id);
           } else {
               setHasPinState(true);
           }
       } catch (e) {
           console.error('Lỗi kiểm tra PIN', e);
       } finally {
           setIsCheckingPin(false);
       }
    }
  };

  const handleUnlock = async (e: any) => {
      e.preventDefault();
      setPinError('');
      try {
          const res = await fetch('/api/config/check-pin', {
              method: 'POST', body: JSON.stringify({ shopId, pin: pinInput })
          });
          const verify = await res.json();
          if (verify.success) {
              setIsUnlocked(true);
              fetchConfigData(shopId);
          } else {
              setPinError(verify.error || 'Sai mã PIN');
          }
      } catch (e) {
          setPinError('Lỗi máy chủ');
      }
  };

  useEffect(() => {
    setMounted(true);
    checkPinFirst();
  }, []);

  const fetchConfigData = async (targetShopId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
    if (userData?.shop_id) {
      setShopId(userData.shop_id);
      const { data: config } = await supabase.from('chatbot_configs').select('*').eq('shop_id', userData.shop_id).single();
      if (config) {
        setShopName(config.shop_name || '');
        setProductInfo(config.product_info || '');
        setPricingInfo(config.pricing_info || '');
        setCustomerInsights(config.customer_insights || '');
        setBrandVoice(config.brand_voice || '');
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
      // 1. Gọi API chuản hóa: Bulk-add để nhúng AI Embeddings thay vì ghi chuỗi thô
      const res = await fetch('/api/faqs/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          faqs: [{ question: sugg.question, answer: sugg.suggested_answer, type: 'info' }]
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo AI Embeddings');

      // 2. Đánh dấu đã xử lý
      await supabase.from('faq_suggestions').update({ status: 'approved' }).eq('id', sugg.id);
      
      setSuggestions(prev => prev.filter(s => s.id !== sugg.id));
      alert('✅ Đã duyệt và Vector hóa thành công nạp vào Xưởng Tri Thức!');
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddManual = async () => {
     if (!bulkFaqInput.trim()) return alert('Vui lòng nhập nội dung!');
     
     // Parse nội dung dòng chữ thành array
     const lines = bulkFaqInput.split('\n');
     const faqsToPush = [];
     let currentQ = '';
     let currentA = '';
     
     for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().startsWith('q:')) {
           if (currentQ && currentA) {
              faqsToPush.push({ question: currentQ, answer: currentA, type: 'info' });
              currentA = ''; 
           }
           currentQ = line.substring(2).trim();
        } else if (line.toLowerCase().startsWith('a:')) {
           currentA = line.substring(2).trim();
        } else if (line !== '') {
           if (currentQ && !currentA) currentQ += ' ' + line;
           else if (currentQ && currentA) currentA += ' ' + line;
        }
     }
     if (currentQ && currentA) {
        faqsToPush.push({ question: currentQ, answer: currentA, type: 'info' });
     }

     if (faqsToPush.length === 0) return alert('Không nhận diện được câu hỏi nào. Vui lòng nhập theo định dạng Q: ... A: ...');

     setIsBulkAdding(true);
     try {
         const res = await fetch('/api/faqs/bulk-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shop_id: shopId, faqs: faqsToPush })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || 'Lỗi Vector');
         alert('✅ ' + data.message);
         setBulkFaqInput('');
         fetchVectorFaqs();
     } catch (e: any) {
         alert('Lỗi: ' + e.message);
     } finally {
         setIsBulkAdding(false);
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
        pricing_info: pricingInfo.trim(),
        customer_insights: customerInsights.trim(),
        brand_voice: brandVoice.trim(),
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

  if (!mounted || isCheckingPin) return <div className="flex flex-col items-center justify-center p-20 opacity-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-xs font-bold font-mono">Đang kiểm tra an ninh...</p></div>;

  if (!isUnlocked) {
      return (
          <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-slate-100 shadow-2xl rounded-3xl animate-in fade-in zoom-in duration-300 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Settings size={150}/></div>
             <div className="relative z-10 text-center">
                 <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                 </div>
                 <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Khu Vực Bảo Mật</h2>
                 <p className="text-xs text-slate-500 mb-8 font-medium">Bạn cần nhập mã PIN để xem và chỉnh sửa cấu hình Shop.</p>
                 <form onSubmit={handleUnlock}>
                    <input 
                       type="password" 
                       value={pinInput} 
                       onChange={e => setPinInput(e.target.value)} 
                       className="w-full text-center text-2xl tracking-[0.5em] font-black bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:outline-none focus:border-rose-500 transition-all mb-2"
                       placeholder="••••"
                       autoFocus
                    />
                    {pinError && <p className="text-[10px] text-rose-500 font-bold mb-4">{pinError}</p>}
                    <button type="submit" className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-slate-200">MỞ KHÓA CONFIG</button>
                 </form>
             </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-0 mb-4">
        <div>
           <h1 className="text-3xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent tracking-tight">Cấu Hình Shop</h1>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Quản lý Tri thức & Tích hợp Mạng xã hội</p>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
           {hasPinState && isUnlocked && (
             <button 
               onClick={() => { setIsUnlocked(false); setPinInput(''); setPinError(''); }} 
               className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all border border-rose-200 shadow-sm"
               title="Khoá Cấu Hình Lại"
             >
               <Lock size={14} /> KHÓA LẠI
             </button>
           )}
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
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSave} className="space-y-8 bg-white/70 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1.5 ml-1">Tên cửa hàng</label>
              <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-700" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1.5 ml-1">Thông tin chung</label>
                <textarea rows={6} value={productInfo} onChange={e => setProductInfo(e.target.value)} placeholder="- Tên thương hiệu: ...&#10;- Địa chỉ: ...&#10;- Hotline: ..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-emerald-600 mb-1.5 ml-1">Thông tin Giá Cả</label>
                <textarea rows={6} value={pricingInfo} onChange={e => setPricingInfo(e.target.value)} placeholder="- Gói Cơ bản: 199k&#10;- Gói VIP: 299k..." className="w-full bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-3.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-indigo-400 mb-1.5 ml-1 flex items-center gap-1">Chiến lược Bán hàng <span className="text-xs">✨</span></label>
                <textarea rows={6} value={customerInsights} onChange={e => setCustomerInsights(e.target.value)} placeholder="- Khi khách hỏi giá, báo giá xong BẮT BUỘC hỏi..." className="w-full bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-3.5 text-sm italic" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-600 mb-1.5 ml-1 flex items-center gap-1">Giọng điệu Chatbot</label>
                <textarea rows={6} value={brandVoice} onChange={e => setBrandVoice(e.target.value)} placeholder="Nhẹ nhàng, lễ phép, xưng 'dạ/vâng'..." className="w-full bg-blue-50/20 border border-blue-100/50 rounded-2xl p-3.5 text-sm italic" />
              </div>
            </div>



            <div className="pt-4 border-t border-dashed border-slate-200 space-y-6">
               <div>
                  <h3 className="text-xs font-black uppercase text-blue-600 mb-3 flex items-center gap-2">
                     <Send size={14} /> Nhận khách qua Telegram (Tùy chọn)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2">Telegram Chat ID</label>
                        <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-mono outline-none focus:border-blue-500" placeholder="-1001234567..." />
                     </div>
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2">Telegram Bot Token</label>
                        <div className="relative">
                            <input type={showToken ? "text" : "password"} value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 pr-10 text-sm font-mono outline-none focus:border-blue-500" placeholder="7123912:AAGF..." />
                            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-blue-600">
                                {showToken ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div>
                  <h3 className="text-xs font-black uppercase text-indigo-600 mb-3 flex items-center gap-2">
                     <MessageSquare size={14} /> Tích hợp Facebook Messenger (Tùy chọn)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2">Facebook Page ID</label>
                        <input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-mono outline-none focus:border-indigo-500" placeholder="1083921..." />
                     </div>
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2">Page Access Token</label>
                        <div className="relative">
                            <input type={showToken ? "text" : "password"} value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl p-3 pr-10 text-sm font-mono outline-none focus:border-indigo-500" placeholder="EAA..." />
                            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-indigo-600">
                                {showToken ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-black py-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.7)] hover:shadow-[0_10px_40px_-5px_rgba(79,70,229,0.9)] hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 mt-8">
            {loading ? 'Đang Thiết Lập...' : 'Xác Nhận Lưu Cấu Hình'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
           {/* Analytics Header */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2"><CheckCircle size={20} /></div>
                 <span className="text-[10px] font-bold text-slate-600 uppercase">Hài lòng</span>
                 <span className="text-2xl font-black text-slate-800">{stats.avg_score}/10</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-2"><Heart size={20} /></div>
                 <span className="text-[10px] font-bold text-slate-600 uppercase">Cảm xúc tích cực</span>
                 <span className="text-2xl font-black text-slate-800">{stats.positive}/{stats.total}</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2"><MessageSquare size={20} /></div>
                 <span className="text-[10px] font-bold text-slate-600 uppercase">Hội thoại</span>
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
                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-none mt-1">Gắn link/voucher vào Ý định khách hàng</p>
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
                             <p className="text-[11px] text-slate-600 truncate w-48 mt-1 font-mono">{action.content}</p>
                          </div>
                       </div>
                       <button onClick={async () => { if(confirm('Xóa?')) { await supabase.from('shop_actions').delete().eq('id', action.id); fetchActions(); } }} className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all">
                          <XCircle size={14}/>
                       </button>
                    </div>
                 ))}
                 {actions.length === 0 && <div className="md:col-span-2 text-center py-6 text-slate-500 italic text-[11px]">Chưa có hành động bán hàng nào được cấu hình...</div>}
              </div>
           </div>

           {/* VÙNG 3: ĐỀ XUẤT FAQ TỪ AI (EXISTING) */}
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                       <Brain className="text-indigo-600" size={20} /> Xưởng Tri Thức AI
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">AI đề xuất thông tin mới dựa trên lịch sử chat thực tế</p>
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
                              <p className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1">
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
            {/* VÙNG 3.5: GÓI TRI THỨC HỆ THỐNG */}
            {globalPackages.length > 0 && (
               <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-3xl border border-indigo-100 shadow-xl mt-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                     <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><CheckCircle size={20}/></div>
                     <div>
                        <h2 className="text-lg font-black text-indigo-900">KHO GÓI TRI THỨC</h2>
                     </div>
                  </div>
                  <div className="flex flex-col gap-4 relative z-10">
                     {globalPackages.map((pkg: any) => (
                        <div key={pkg.id} className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-indigo-100/50 shadow-sm transition-all group overflow-hidden">
                           <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedPackageId(expandedPackageId === pkg.id ? null : pkg.id)}>
                               <div>
                                  <p className="text-xs font-black text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">{pkg.package_name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-1">Ngành: {pkg.industry_name}</p>
                               </div>
                               <div className="flex items-center gap-3">
                                   <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-200 hidden sm:block">Đang hoạt động</div>
                                   <button className="text-indigo-500 font-bold text-[10px] uppercase hover:underline">{expandedPackageId === pkg.id ? 'Thu gọn' : 'Xem chi tiết'}</button>
                               </div>
                           </div>
                           
                           {expandedPackageId === pkg.id && pkg.faq_json && pkg.faq_json.length > 0 && (
                               <div className="mt-4 pt-4 border-t border-indigo-50 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                   {pkg.faq_json.map((f: any, idx: number) => (
                                       <div key={idx} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                           <p className="text-[11px] font-black text-slate-800 mb-1">Q: {f.q}</p>
                                           <p className="text-[11px] text-slate-600 leading-relaxed">A: {f.a}</p>
                                       </div>
                                   ))}
                               </div>
                           )}
                           
                           {expandedPackageId === pkg.id && (!pkg.faq_json || pkg.faq_json.length === 0) && (
                               <div className="mt-4 pt-4 border-t border-indigo-50 text-center py-4">
                                   <p className="text-[10px] font-bold text-slate-400">Gói này không có dữ liệu FAQ chi tiết.</p>
                               </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* VÙNG 4: KHO TRI THỨC ĐÃ LƯU (VECTOR DB) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl mt-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <CheckCircle className="text-blue-500" size={20} /> Kho Tri Thức Riêng
                     </h2>
                     <p className="text-xs text-slate-600 font-medium">Danh sách các câu hỏi đã được huấn luyện cho AI và đang hoạt động</p>
                  </div>
                  <button onClick={fetchVectorFaqs} className="text-[10px] font-bold text-blue-600 hover:underline">Làm mới</button>
               </div>

               {/* Công cụ nhập liệu hàng loạt */}
               <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300">
                  <label className="block text-xs font-black text-slate-700 uppercase mb-2">Thêm nhanh hàng loạt (Q&A)</label>
                  <p className="text-[10px] text-slate-500 mb-3">Nhập theo định dạng: <br/><b>Q:</b> Câu hỏi của khách<br/><b>A:</b> Câu trả lời của shop</p>
                  <textarea 
                     rows={4}
                     value={bulkFaqInput}
                     onChange={e => setBulkFaqInput(e.target.value)}
                     placeholder="Q: Shop ở đâu vậy?&#10;A: Dạ shop ở 123 Nguyễn Văn Linh ạ.&#10;&#10;Q: Có chỗ đậu ô tô không?&#10;A: Dạ bãi xe rỗng rãi thoải mái ạ."
                     className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-blue-400"
                  />
                  <button 
                     onClick={handleBulkAddManual}
                     disabled={isBulkAdding}
                     className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                     {isBulkAdding ? 'Đang đồng bộ AI...' : 'Nạp vào Trí Não AI'}
                  </button>
               </div>

               {vectorFaqs.length === 0 ? (
                 <div className="py-6 text-center opacity-50">
                    <p className="text-xs font-bold">Chưa có tri thức nào được đồng bộ.</p>
                 </div>
               ) : (
                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {vectorFaqs.map((f: any) => (
                      <div key={f.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between gap-4 group hover:border-emerald-200 transition-all">
                         <div className="flex-1">
                            <p className="text-[11px] font-black text-slate-800 mb-1">Q: {f.question}</p>
                            <p className="text-[11px] text-slate-600">A: {f.answer}</p>
                         </div>
                         <button 
                           onClick={async () => {
                             if(confirm('Bạn có chắc muốn xóa tri thức này? AI sẽ không dùng nó nữa.')) {
                               await supabase.from('faqs').delete().eq('id', f.id);
                               fetchVectorFaqs();
                             }
                           }}
                           className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shrink-0"
                         >
                           <XCircle size={14}/>
                         </button>
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
