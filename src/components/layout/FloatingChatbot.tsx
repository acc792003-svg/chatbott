'use client';

import { useState } from 'react';
import { Bot, X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const shopCode = 'CB-C8LUZ8'; // Cấu hình shop người dùng yêu cầu

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] h-[600px] max-h-[80vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Bot size={22} />
              </div>
              <div>
                <p className="font-black text-sm leading-tight">Hỗ Trợ Trực Tuyến</p>
                <p className="text-[10px] text-blue-100 opacity-80 uppercase tracking-widest font-bold">● Đang hoạt động</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 relative">
            <iframe 
              src={`/widget/${shopCode}`}
              className="w-full h-full border-none"
              title="Chatbot Support"
            />
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 active:scale-95 group relative",
          isOpen 
            ? "bg-white text-slate-800 rotate-180 border border-slate-100" 
            : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:scale-110"
        )}
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <>
            <MessageCircle size={28} />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-white rounded-full animate-pulse"></div>
          </>
        )}
      </button>
    </div>
  );
}
