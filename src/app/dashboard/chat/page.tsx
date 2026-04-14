'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, ArrowDownCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Chào bạn! Tôi là trợ lý ảo của shop. Tôi có thể giúp gì cho bạn hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // 1. Get current session and shop info
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");

      // We need the shop_id from the user table
      const { data: userData } = await supabase.from('users').select('shop_id, role').eq('id', session.user.id).single();
      
      let shopConfig = null;

      if (!userData?.shop_id) {
         if (userData?.role === 'super_admin') {
            shopConfig = { shop_name: 'Super Admin Test', product_info: 'Cửa hàng đang bảo trì', faq: 'Đây là không gian dành cho Super Admin thử nghiệm tính năng AI.' };
         } else {
            throw new Error("Tài khoản của bạn chưa được liên kết với bất kỳ cửa hàng nào!");
         }
      } else {
         // 2. Fetch the chatbot configuration
         const { data: config } = await supabase.from('chatbot_configs').select('*').eq('shop_id', userData.shop_id).single();
         shopConfig = config;
      }

      // 3. Call the Gemini API Route
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          shopConfig: shopConfig || { shop_name: 'Cửa hàng', product_info: '', faq: '' }
        }),
      });

      const data = await res.json();
      
      if (data.error) {
         throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `[Lỗi hệ thống]: ${err.message}. Hãy kiểm tra kết nối API.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col glass rounded-[2.5rem] overflow-hidden max-w-5xl mx-auto shadow-2xl relative">
      <div className="bg-white/80 backdrop-blur-md px-8 py-4 border-b border-slate-100 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm tracking-tight">AI Chat Demo</h3>
            <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Đang hoạt động
            </p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([messages[0]])}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
      >
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={cn(
              "flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-300",
              m.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              m.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border text-blue-600"
            )}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cn(
              "max-w-[70%] px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
              m.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center text-blue-600">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-100 px-5 py-3.5 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 pt-4">
        <form onSubmit={handleSend} className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder="Nhập tin nhắn để thử nghiệm..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] py-5 px-8 pr-16 text-sm font-bold shadow-inner focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-black tracking-widest flex items-center justify-center gap-2">
           <Zap size={10} className="text-amber-500" />
           Sử dụng Chatbot AI • {50 - messages.length}/50 lượt còn lại
        </p>
      </div>
    </div>
  );
}
