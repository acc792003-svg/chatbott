'use client';

import { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  Zap, 
  TrendingUp, 
  ArrowUpRight,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  usage_tokens: number;
  created_at: string;
  shop_id?: string;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    messagesToday: 0,
    customersToday: 0,
    aiUses: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('user');
  const [shopId, setShopId] = useState<string | null>(null);
  
  // Lịch sử
  const [recentChats, setRecentChats] = useState<ChatMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role, shop_id')
          .eq('id', user.id)
          .single();
          
        const role = userData?.role || 'user';
        const sId = userData?.shop_id;
        setUserRole(role);
        setShopId(sId);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        let messagesQuery = supabase
          .from('messages')
          .select('id, session_id, usage_tokens, created_at, user_message, ai_response, shop_id')
          .gte('created_at', todayStart.toISOString());
          
        if (role !== 'super_admin' && sId) {
          messagesQuery = messagesQuery.eq('shop_id', sId);
        }

        const { data: messagesData, error } = await messagesQuery;
        
        if (messagesData) {
          const sessions = new Set(messagesData.map((m: any) => m.session_id));
          const totalUses = messagesData.reduce((acc: number, m: any) => acc + (m.usage_tokens || 0), 0);
          
          setStats({
            messagesToday: messagesData.length,
            customersToday: sessions.size,
            aiUses: totalUses
          });
          
          const latestBySession = new Map<string, ChatMessage>();
          messagesData.forEach((m: any) => {
            const current = latestBySession.get(m.session_id);
            if (!current || new Date(m.created_at) > new Date(current.created_at)) {
              latestBySession.set(m.session_id, m as ChatMessage);
            }
          });
          
          setRecentChats(Array.from(latestBySession.values()).sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 10)); // Lấy 10 khách hàng gần nhất
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    
    let historyQuery = supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
        
    if (userRole !== 'super_admin' && shopId) {
       historyQuery = historyQuery.eq('shop_id', shopId);
    }
        
    const { data } = await historyQuery;
    if (data) setChatHistory(data as ChatMessage[]);
  };

  if (loading) {
    return <div className="flex h-64 justify-center items-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  const statCards = [
    { name: 'Tin nhắn hôm nay', value: stats.messagesToday.toString(), change: 'Thực tế', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Khách hàng', value: stats.customersToday.toString(), change: 'Thực tế', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Lượt AI đã dùng (Tokens)', value: stats.aiUses.toString(), change: 'Thực tế', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Tổng Quan {userRole === 'super_admin' && <span className="text-red-500 text-sm ml-2">(Super Admin Mode)</span>}
        </h1>
        <p className="text-slate-500 font-medium">Dữ liệu hiệu suất chatbot của bạn hôm nay (Dữ liệu thực tế).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="glass p-6 rounded-[2.5rem] group hover:scale-[1.02] transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
              <div className={stat.bg + " p-3 rounded-2xl " + stat.color}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                {stat.change}
                <TrendingUp size={12} />
              </span>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold mb-1 uppercase tracking-wider">{stat.name}</p>
              <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-[2.5rem] h-[550px] overflow-hidden flex flex-col">
           <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {userRole === 'super_admin' ? 'Giám sát Lịch sử Chat (Super Admin)' : 'Lịch Sử Trò Chuyện Các KH'}
              </h3>
           </div>
           
           {!selectedSessionId ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {recentChats.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center mt-10">Chưa có cuộc trò chuyện nào hôm nay.</p>
                ) : (
                  recentChats.map((chat) => (
                    <div onClick={() => handleSelectSession(chat.session_id)} key={chat.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                         U{String(chat.session_id).substring(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">Khách hàng: {String(chat.session_id).substring(0,8)}...</p>
                        <p className="text-[11px] text-slate-500 truncate">{chat.user_message}</p>
                      </div>
                      <ChevronDown size={16} className="text-slate-400" />
                    </div>
                  ))
                )}
              </div>
           ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <button onClick={() => setSelectedSessionId(null)} className="mb-4 text-sm font-bold text-blue-600 flex items-center gap-1 shrink-0">
                   &larr; Quay lại danh sách
                </button>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 bg-slate-50/50 rounded-xl p-4">
                   {chatHistory.map(msg => (
                     <div key={msg.id} className="space-y-3">
                        <div className="flex flex-col items-end">
                           <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[80%] break-words shadow-sm">
                             {msg.user_message}
                           </div>
                           <span className="text-[10px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleTimeString('vi-VN')}</span>
                        </div>
                        {msg.ai_response && (
                          <div className="flex flex-col items-start">
                             <div className="bg-white border border-slate-100 text-slate-800 p-3 rounded-2xl rounded-tl-none text-sm max-w-[80%] break-words shadow-sm">
                               {msg.ai_response}
                             </div>
                             <span className="text-[10px] text-slate-400 mt-1">AI Chatbot</span>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>
           )}
        </div>

        <div className="glass p-8 rounded-[2.5rem] h-[550px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
             <TrendingUp size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Biểu đồ đang phát triển</h3>
          <p className="text-sm text-slate-500 max-w-xs">Chúng tôi đang xử lý dữ liệu để hiển thị biểu đồ tăng trưởng của bạn trong 7 ngày qua.</p>
        </div>
      </div>
    </div>
  );
}
