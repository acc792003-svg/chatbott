'use client';

import { useState, useRef, useEffect, use } from 'react';
import { Send, Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/app/globals.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function WidgetPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Đang kết nối cùng trợ lý...' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('Trợ lý Tự động');
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string>('');

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
      
      // Khởi tạo giá trị ban đầu
      handleResize();
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Lấy lời chào tự động và khôi phục lịch sử khi vừa mở widget
  useEffect(() => {
    if (!clientId) return;

    const fetchGreeting = async () => {
      try {
        // 1. Load lịch sử từ API riêng (GET)
        const histRes = await fetch(`/api/chat/history?code=${code}&clientId=${clientId}`);
        const histData = await histRes.json();
        
        if (histData.history && histData.history.length > 0) {
           const historyMessages: Message[] = [];
           histData.history.forEach((h: any) => {
              historyMessages.push({ role: 'user', content: h.user_message });
              historyMessages.push({ role: 'assistant', content: h.ai_response });
           });
           setMessages(historyMessages);
           if (histData.shop_name) setShopName(histData.shop_name);
           return; // Nếu đã có lịch sử, không cần lấy lời chào mặc định nữa
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
      } catch (e) {
        console.error('Không lấy được lời chào:', e);
      }
    };
    fetchGreeting();
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
          // Gửi tối đa 5 tin nhắn gần nhất để làm ngữ cảnh
          history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      
      if (data.error) {
         throw new Error(data.error);
      }

      // Cập nhật tên shop từ chatbot_configs.shop_name
      if (data.shop_name) setShopName(data.shop_name);

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `[Lỗi]: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col bg-transparent p-2 transition-[height] duration-200"
      style={{ height: viewportHeight }}
    >
       <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
         {/* Header */}
         <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center gap-3 shrink-0">
           <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
             <Bot size={18} />
           </div>
           <div>
              <h3 className="font-bold text-sm leading-tight">{shopName}</h3>
              <p className="text-[10px] text-blue-100 opacity-80">Luôn sẵn sàng hỗ trợ</p>
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
           {messages.map((msg, i) => (
             <div key={i} className={cn(
               "flex w-full",
               msg.role === 'user' ? "justify-end" : "justify-start"
             )}>
               <div className={cn(
                 "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
                 msg.role === 'user' 
                   ? "bg-blue-600 text-white rounded-br-sm" 
                   : "bg-white text-slate-700 border border-slate-100 rounded-bl-sm"
               )}>
                 {msg.content}
               </div>
             </div>
           ))}
           {loading && (
             <div className="flex justify-start w-full">
               <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1">
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           )}
         </div>

         {/* Input */}
         <form 
           onSubmit={handleSend} 
           className="p-3 bg-white border-t border-slate-100 shrink-0"
         >
           <div className="relative flex items-center">
             <input 
               type="text" 
               value={input}
               onChange={e => setInput(e.target.value)}
               onFocus={() => {
                 // Đợi bàn phím bật lên rồi cuộn xuống tin nhắn cuối
                 setTimeout(() => {
                   if (scrollRef.current) {
                     scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                   }
                 }, 300);
               }}
               placeholder="Nhập câu hỏi..." 
               className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
               disabled={loading}
             />
             <button 
               type="submit" 
               disabled={!input.trim() || loading}
               className="absolute right-1 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
             >
               <Send size={16} className="ml-1" />
             </button>
           </div>
         </form>
       </div>
    </div>
  );
}
