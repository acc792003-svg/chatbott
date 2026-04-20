'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  MessageSquare,
  ArrowRight,
  Bot
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
      if (!userData?.shop_id) return;

      // 1 ngày = 24h qua
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('shop_id', userData.shop_id)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false });

      if (messages) setHistory(messages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lịch Sử Trò Chuyện</h1>
          <p className="text-slate-500 font-medium">Lịch sử hội thoại trong 24 giờ qua (1 ngày).</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchHistory} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-all">
             Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100/50 border border-white">
        <div className="p-4 bg-white/50 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nội dung..." 
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="flex justify-center items-center h-64 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                Đang tải dữ liệu...
             </div>
          ) : history.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-20 opacity-60">
                <MessageSquare size={48} className="text-slate-300 mb-4" />
                <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Chưa có hội thoại nào</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Không có tin nhắn nào trong 24 giờ qua</p>
             </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-30">
                <tr className="bg-indigo-50 text-[9px] font-black text-indigo-500 uppercase tracking-wide shadow-sm">
                  <th className="px-6 py-4 w-32 border-b border-indigo-100">Session</th>
                  <th className="px-6 py-4 w-1/3 border-b border-indigo-100">User Msg</th>
                  <th className="px-6 py-4 w-1/2 border-b border-indigo-100">AI Response</th>
                  <th className="px-6 py-4 w-24 border-b border-indigo-100">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => {
                  const isExpanded = expandedId === h.id;
                  return (
                    <tr 
                      key={h.id} 
                      onClick={() => toggleExpand(h.id)}
                      className={cn(
                        "group transition-all duration-500 cursor-pointer border-b border-slate-100 last:border-0",
                        isExpanded ? "bg-indigo-50/40 ring-1 ring-inset ring-indigo-200 shadow-inner" : "hover:bg-slate-50/50"
                      )}
                    >
                      <td className="px-6 py-4 align-top">
                          <span className={cn(
                            "font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm transition-colors",
                            isExpanded ? "bg-indigo-600 text-white" : "text-indigo-600 bg-indigo-50"
                          )}>
                            #{(h.session_id || '').replace(/-/g, '').substring(0, 6).toUpperCase()}
                          </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 align-top transition-all duration-500",
                        isExpanded ? "w-48 opacity-40" : "w-1/3"
                      )}>
                        <div className={cn(
                          "overflow-hidden transition-all duration-500",
                          isExpanded ? "max-h-24 scale-95 origin-left" : "max-h-24"
                        )}>
                          <p className="text-[12px] text-slate-800 font-medium whitespace-pre-wrap leading-relaxed line-clamp-3 group-hover:line-clamp-none">
                            {h.user_message}
                          </p>
                        </div>
                      </td>
                      <td className={cn(
                        "px-6 py-4 align-top transition-all duration-500",
                        isExpanded ? "w-full" : "w-1/2"
                      )}>
                        <div className="relative group/ai max-w-full h-full">
                          <div className={cn(
                            "text-[12px] text-emerald-800 bg-emerald-50/30 p-3 rounded-2xl whitespace-pre-wrap leading-relaxed border border-emerald-100/30 transition-all duration-500 shadow-sm",
                            isExpanded 
                              ? "max-h-none opacity-100 bg-white border-emerald-500 shadow-xl shadow-emerald-900/10 scale-[1.02] -translate-x-4" 
                              : "max-h-20 overflow-hidden line-clamp-3 mb-1 group-hover:bg-white/80"
                          )}>
                            <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-1.5 opacity-60">
                                  <Bot size={12} className="text-emerald-600" />
                                  <span className="text-[9px] font-black uppercase tracking-tighter">AI Assistant</span>
                               </div>
                               {isExpanded && (
                                 <span className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full animate-pulse">ĐANG XEM CHI TIẾT</span>
                               )}
                            </div>
                            {h.ai_response}
                          </div>
                          {!isExpanded && h.ai_response && h.ai_response.length > 100 && (
                            <div className="text-[9px] font-bold text-slate-400 italic px-2">Nhấn để xem toàn bộ...</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                        <p className={cn(
                          "text-[11px] font-bold transition-colors",
                          isExpanded ? "text-indigo-600" : "text-slate-700"
                        )}>{new Date(h.created_at).toLocaleTimeString()}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(h.created_at).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
   return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
   )
}
