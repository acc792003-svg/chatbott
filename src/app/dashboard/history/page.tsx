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

  useEffect(() => {
    fetchHistory();
  }, []);

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

        <div className="overflow-x-auto min-h-[500px]">
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
            <table className="w-full text-left">
              <thead>
                <tr className="bg-indigo-50/50 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  <th className="px-8 py-4">Khách hàng / Session</th>
                  <th className="px-8 py-4">Câu hỏi (User)</th>
                  <th className="px-8 py-4">AI Trả lời</th>
                  <th className="px-8 py-4">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-md">
                          <UserIcon />
                        </div>
                        <span className="font-bold text-xs text-slate-600 block w-24 truncate" title={h.session_id}>{h.session_id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-slate-900 font-bold line-clamp-2 leading-relaxed max-w-xs">{h.user_message}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-2xl line-clamp-2 max-w-md shadow-inner">{h.ai_response}</p>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <p className="text-sm font-black text-slate-900">{new Date(h.created_at).toLocaleTimeString()}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(h.created_at).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
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
