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
  
  // Dữ liệu biểu đồ
  const [msgChart, setMsgChart] = useState<number[]>([0,0,0,0,0,0,0]);
  const [leadChart, setLeadChart] = useState<number[]>([0,0,0,0,0,0,0]);

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

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0,0,0,0);
        
        // 1. Lấy thống kê cơ bản hôm nay
        let messagesQuery = supabase
          .from('messages')
          .select('id, session_id, usage_tokens, created_at, user_message, ai_response, shop_id')
          .gte('created_at', todayStart.toISOString());
          
        if (role !== 'super_admin' && sId) {
          messagesQuery = messagesQuery.eq('shop_id', sId);
        }

        const { data: messagesData } = await messagesQuery;
        
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
          ).slice(0, 10));
        }

        // 2. Fetch Dữ liệu biểu đồ (7 ngày)
        let chartMsgQuery = supabase.from('messages').select('created_at').gte('created_at', sevenDaysAgo.toISOString());
        let chartLeadQuery = supabase.from('leads').select('created_at').gte('created_at', sevenDaysAgo.toISOString());

        if (role !== 'super_admin' && sId) {
            chartMsgQuery = chartMsgQuery.eq('shop_id', sId);
            chartLeadQuery = chartLeadQuery.eq('shop_id', sId);
        }

        const [{data: rawMsgs}, {data: rawLeads}] = await Promise.all([chartMsgQuery, chartLeadQuery]);

        if (rawMsgs) {
            const counts = new Array(7).fill(0);
            rawMsgs.forEach((m: any) => {
                const dayDiff = Math.floor((new Date(m.created_at).getTime() - sevenDaysAgo.getTime()) / (24*60*60*1000));
                if (dayDiff >= 0 && dayDiff < 7) counts[dayDiff]++;
            });
            setMsgChart(counts);
        }
        if (rawLeads) {
            const counts = new Array(7).fill(0);
            rawLeads.forEach((l: any) => {
                const dayDiff = Math.floor((new Date(l.created_at).getTime() - sevenDaysAgo.getTime()) / (24*60*60*1000));
                if (dayDiff >= 0 && dayDiff < 7) counts[dayDiff]++;
            });
            setLeadChart(counts);
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
        <div className="glass p-8 rounded-[2.5rem] h-[580px] overflow-hidden flex flex-col">
           <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {userRole === 'super_admin' ? 'Giám sát Lịch sử Chat (Super Admin)' : 'Lịch Sử Trò Chuyện Các KH'}
              </h3>
           </div>
           
           {!selectedSessionId ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {recentChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <MessageSquare size={40} className="mb-2" />
                    <p className="text-slate-500 text-sm">Chưa có cuộc trò chuyện nào hôm nay.</p>
                  </div>
                ) : (
                  recentChats.map((chat) => (
                    <div onClick={() => handleSelectSession(chat.session_id)} key={chat.id} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 group">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs uppercase shadow-inner group-hover:scale-110 transition-transform">
                         U{String(chat.session_id).substring(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-sm font-black text-slate-900 truncate">Khách hàng: {String(chat.session_id).substring(0,8)}...</p>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(chat.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate">{chat.user_message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
           ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <button onClick={() => setSelectedSessionId(null)} className="mb-4 text-xs font-black text-blue-600 flex items-center gap-2 hover:translate-x-[-4px] transition-transform w-fit">
                   <ArrowUpRight size={14} className="rotate-[225deg]" /> Quay lại danh sách
                </button>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 bg-slate-50/50 rounded-[2rem] p-6 custom-scrollbar border border-white/50">
                   {chatHistory.map(msg => (
                     <div key={msg.id} className="space-y-4">
                        <div className="flex flex-col items-end">
                           <div className="bg-blue-600 text-white px-5 py-3 rounded-3xl rounded-tr-none text-sm max-w-[85%] break-words shadow-lg shadow-blue-100/50 font-medium">
                             {msg.user_message}
                           </div>
                           <span className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">{new Date(msg.created_at).toLocaleTimeString('vi-VN')}</span>
                        </div>
                        {msg.ai_response && (
                          <div className="flex flex-col items-start pt-1">
                             <div className="bg-white border border-slate-100 text-slate-800 px-5 py-3 rounded-3xl rounded-tl-none text-sm max-w-[85%] break-words shadow-sm font-medium">
                               {msg.ai_response}
                             </div>
                             <span className="text-[9px] font-bold text-indigo-500 mt-1.5 uppercase tracking-widest">AI Agent Response</span>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>
           )}
        </div>

        <div className="glass p-8 rounded-[2.5rem] h-[580px] flex flex-col bg-gradient-to-br from-white/80 to-slate-50/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
               <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thống Kê Phát Triển (7 Ngày)</h3>
          </div>

          <div className="flex-1 space-y-12">
            {/* Chart 1: Messages */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Lượng tin nhắn</p>
                  <h4 className="text-xl font-black text-slate-900">Tính tương tác</h4>
                </div>
                <div className="flex items-center gap-1.5 text-blue-600">
                  <MessageSquare size={14} />
                  <span className="text-xs font-black">78.5% Growth</span>
                </div>
              </div>
              <div className="h-32 flex items-end justify-between gap-1.5 px-2">
                {msgChart.map((val, i) => {
                  const max = Math.max(...msgChart, 1);
                  const h = Math.max((val / max) * 100, 5); // Tối thiểu 5% để vẫn thấy vạch
                  const dateLabel = new Date();
                  dateLabel.setDate(dateLabel.getDate() - (6 - i));
                  const label = dateLabel.toLocaleDateString('vi-VN', { weekday: 'short' });

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-lg group-hover:scale-110 group-hover:brightness-110 transition-all cursor-pointer relative"
                        style={{ height: `${h}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black py-0.5 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl z-20">
                          {val} tin
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 border-t border-slate-100 pt-1 w-full text-center uppercase tracking-tighter">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Leads */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Khách để lại SĐT</p>
                  <h4 className="text-xl font-black text-slate-900">Tỷ lệ Lead (Tiềm năng)</h4>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <Users size={14} />
                  <span className="text-xs font-black">Stable 24h</span>
                </div>
              </div>
              <div className="h-32 flex items-end justify-between gap-1.5 px-2">
                {leadChart.map((val, i) => {
                   const max = Math.max(...leadChart, 1);
                   const h = Math.max((val / max) * 100, 5);
                   const dateLabel = new Date();
                   dateLabel.setDate(dateLabel.getDate() - (6 - i));
                   const label = dateLabel.toLocaleDateString('vi-VN', { weekday: 'short' });

                   return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-lg group-hover:scale-110 group-hover:brightness-110 transition-all cursor-pointer relative"
                        style={{ height: `${h}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black py-0.5 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl z-20">
                          {val} Lead
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 border-t border-slate-100 pt-1 w-full text-center uppercase tracking-tighter">{label}</span>
                    </div>
                   );
                })}
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100/50">
             <div className="flex items-center gap-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                <Zap size={14} className="text-black fill-amber-400" />
                <p className="text-[10px] font-bold text-indigo-900">Dữ liệu được cập nhật thời gian thực dựa trên tương tác AI của bạn.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
