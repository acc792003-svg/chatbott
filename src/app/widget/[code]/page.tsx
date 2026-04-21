'use client';

import { useState, useRef, useEffect, use } from 'react';
import { Send, Bot, Sparkles, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import '@/app/globals.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
};

export default function WidgetPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [shopName, setShopName] = useState('Trợ lý Tự động');
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string>('');
  const [errorCount, setErrorCount] = useState(0);

  // Lấy hoặc tạo Client ID duy nhất cho trình duyệt này
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('chatbot_client_id');
      if (!id) {
        id = `c-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
        localStorage.setItem('chatbot_client_id', id);
      }
      setClientId(id);
    }
  }, []);

  // Xử lý Visual Viewport cho thiết bị di động (để tránh bị bàn phím che)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleResize = () => {
        const height = window.visualViewport?.height;
        if (height) {
          setViewportHeight(`${height}px`);
        }
      };
      
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      handleResize();
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Lấy lời chào tự động và khôi phục lịch sử khi vừa mở widget
  const loadInitialData = async () => {
    if (!clientId) return;
    setLoading(true);

    try {
      // 1. Load lịch sử từ API riêng (GET)
      const histRes = await fetch(`/api/chat/history?code=${code}&clientId=${clientId}`);
      if (!histRes.ok) throw new Error('Network response resticted');
      
      const histData = await histRes.json();
      
      if (histData.history && histData.history.length > 0) {
         const historyMessages: Message[] = [];
         histData.history.forEach((h: any) => {
            historyMessages.push({ role: 'user', content: h.user_message });
            historyMessages.push({ role: 'assistant', content: h.ai_response });
         });
         setMessages(historyMessages);
         if (histData.shop_name) setShopName(histData.shop_name);
         setAppReady(true);
         setLoading(false);
         return;
      }

      // 2. Nếu chưa từng chat (không có lịch sử), lấy lời chào mặc định
      const res = await fetch('/api/chat/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '[WELCOME]', code: code, history: [], clientId }),
      });
      const data = await res.json();
      if (data.response) {
        setMessages([{ role: 'assistant', content: data.response }]);
      }
      if (data.shop_name) setShopName(data.shop_name);
      setAppReady(true);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu ban đầu:', e);
      setErrorCount(prev => prev + 1);
      // Nếu lỗi lần đầu, thử lại sau 2 giây
      if (errorCount < 2) {
        setTimeout(loadInitialData, 2000);
      } else {
        setMessages([{ role: 'assistant', content: 'Có lỗi kết nối. Vui lòng bấm vào biểu tượng làm mới để thử lại.' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [code, clientId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          code: code,
          clientId: clientId,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.shop_name) setShopName(data.shop_name);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `[Hệ thống]: Không thể kết nối. Vui lòng thử lại.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col bg-transparent overflow-hidden"
      style={{ height: viewportHeight }}
    >
       <div className="flex-1 flex flex-col bg-white overflow-hidden relative border-x border-t border-slate-100 sm:rounded-t-2xl shadow-inner">
         
         {/* Premium Header */}
         <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm shrink-0 z-10">
           <div className="flex items-center gap-3">
             <div className="relative">
               <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                 <Bot size={22} />
               </div>
               <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
             </div>
             <div>
                <h3 className="font-black text-[15px] leading-tight text-slate-800 tracking-tight">{shopName}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trực tuyến</p>
                </div>
              </div>
           </div>
           
           <button 
             onClick={() => loadInitialData()}
             className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all"
           >
             <RefreshCcw size={16} className={loading && !appReady ? 'animate-spin' : ''} />
           </button>
         </div>

         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]" ref={scrollRef}>
           <AnimatePresence initial={false}>
             {messages.map((msg, i) => (
               <motion.div 
                 key={i}
                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ duration: 0.2 }}
                 className={cn(
                   "flex w-full items-start gap-2",
                   msg.role === 'user' ? "justify-end" : "justify-start"
                 )}
               >
                 {msg.role === 'assistant' && (
                   <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                     <Sparkles size={12} />
                   </div>
                 )}
                 <div className={cn(
                   "max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm",
                   msg.role === 'user' 
                     ? "bg-blue-600 text-white rounded-tr-none font-medium" 
                     : "bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium"
                 )}>
                   {msg.content}
                 </div>
               </motion.div>
             ))}
           </AnimatePresence>
           
           {loading && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="flex justify-start items-start gap-2"
             >
               <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                 <Sparkles size={12} />
               </div>
               <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1.5 items-center">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
               </div>
             </motion.div>
           )}
         </div>

         {/* Premium Input Area */}
         <div className="p-4 bg-white border-t border-slate-100 shrink-0">
           <form 
             onSubmit={handleSend} 
             className="relative flex items-center gap-2 group"
           >
             <div className="flex-1 relative">
               <input 
                 type="text" 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 placeholder="Hỏi trợ lý ngay..." 
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-4 pr-12 text-[14px] font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800"
                 disabled={loading}
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 {input.length > 0 && (
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                      <Send size={16} />
                    </button>
                 )}
               </div>
             </div>
             {!input && (
                <button 
                  type="button"
                  onClick={() => setInput("Sản phẩm của shop là gì?")}
                  className="w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <Sparkles size={18} />
                </button>
             )}
           </form>
           <p className="text-[10px] text-center text-slate-400 mt-2.5 font-bold uppercase tracking-[0.1em]">
             Powered by <span className="text-blue-500">ChatBot Pro</span>
           </p>
         </div>
       </div>
    </div>
  );
}
