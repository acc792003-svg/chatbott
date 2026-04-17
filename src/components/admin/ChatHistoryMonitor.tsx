'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Bot } from 'lucide-react';

export default function ChatHistoryMonitor({ shopId }: { shopId: string }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (data) setMessages(data);
            setLoading(false);
        };
        fetchHistory();
    }, [shopId]);

    if (loading) return <div className="text-[10px] font-bold text-slate-500 animate-pulse">ĐANG TRUY XUẤT DỮ LIỆU...</div>;
    if (messages.length === 0) return <div className="text-[10px] font-bold text-slate-600 italic">Chưa phát sinh hội thoại nào.</div>;

    return (
        <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {messages.map((m) => (
                <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all group">
                    <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><User size={10}/> Khách hàng</span>
                        <span className="text-[9px] font-bold text-slate-600">{new Date(m.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-xs font-medium text-white mb-4 leading-relaxed italic">"{m.user_message}"</p>
                    
                    <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black text-indigo-400 uppercase flex items-center gap-1"><Bot size={10}/> Phản hồi từ AI</span>
                    </div>
                    <p className="text-xs font-bold text-indigo-100 leading-relaxed">{m.ai_response}</p>
                </div>
            ))}
        </div>
    );
}
