'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Phone, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Trash2,
  ExternalLink,
  Loader2,
  MessageCircle,
  PhoneCall,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  phone: string;
  customer_name: string;
  first_message: string;
  status: string;
  created_at: string;
  session_id: string;
}

export default function LeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'done'>('all');

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase.from('users').select('shop_id').eq('id', session.user.id).single();
      if (userData?.shop_id) {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('shop_id', userData.shop_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLeads(data || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      setLeads(leads.filter(l => l.id !== id));
    } catch (err) {
      alert('Lỗi khi xóa');
    }
  };

  const filteredLeads = leads.filter(l => {
    if (filter === 'all') return true;
    return l.status === filter;
  });

  if (loading) return <div className="flex h-64 justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const newLeadsCount = leads.filter(l => l.status !== 'done').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">QUẢN LÝ KHÁCH HÀNG</h1>
          <p className="text-slate-500 font-medium">Tự động thu thập thông tin khách hàng tiềm năng qua trợ lý ảo.</p>
        </div>
        
        <div className="flex gap-3">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-blue-100 flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Mới nhất</span>
                <span className="text-2xl font-black leading-none">{newLeadsCount}</span>
            </div>
            <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng cộng</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{leads.length}</span>
            </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 w-fit rounded-2xl border border-slate-200 shadow-inner">
         <button 
          onClick={() => setFilter('all')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider",
            filter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
         >
           Tất cả
         </button>
         <button 
          onClick={() => setFilter('new')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider",
            filter === 'new' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
         >
           Đang chờ
         </button>
         <button 
          onClick={() => setFilter('done')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider",
            filter === 'done' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
         >
           Đã xử lý
         </button>
      </div>

      {/* Leads List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLeads.length === 0 ? (
          <div className="glass p-24 rounded-[3.5rem] text-center space-y-6 flex flex-col items-center border border-white">
             <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center animate-pulse">
                <Users size={40} />
             </div>
             <div className="space-y-1">
                <p className="text-lg font-black text-slate-800">Chưa có dữ liệu khách hàng</p>
                <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Trợ lý ảo đang trực để sẵn sàng thu thập số điện thoại khách hàng giúp bạn.</p>
             </div>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className={cn(
              "glass p-8 rounded-[2.5rem] transition-all border group relative overflow-hidden",
              lead.status === 'done' ? "bg-white/40 grayscale-[0.3]" : "bg-white border-blue-50 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:scale-[1.005]"
            )}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                {/* Left info */}
                <div className="flex items-start gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                    lead.status === 'done' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-100'
                  )}>
                    <PhoneCall size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 selection:bg-blue-100">{lead.phone}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Calendar size={13} className="text-slate-300" />
                        {new Date(lead.created_at).toLocaleString('vi-VN')}
                      </span>
                      <span className={cn(
                        "text-[10px] font-black uppercase px-3 py-1 rounded-full border tracking-wider",
                        lead.status === 'done' 
                          ? 'bg-green-50 text-green-600 border-green-100' 
                          : 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse'
                      )}>
                        {lead.status === 'done' ? '✓ Đã liên hệ' : '● Khách mới'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content info */}
                <div className="flex-1 max-w-lg bg-slate-50/70 p-5 rounded-[1.5rem] border border-slate-100 group-hover:bg-blue-50/50 transition-colors">
                   <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
                      <MessageSquare size={12} className="text-slate-300" /> Nhu cầu khách hàng
                   </div>
                   <p className="text-sm text-slate-700 italic leading-relaxed line-clamp-3">"{lead.first_message}"</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                   {/* Quick Contact Buttons */}
                   <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
                      <a 
                        href={`tel:${lead.phone}`}
                        className="p-3 text-blue-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                        title="Gọi điện ngay"
                      >
                        <PhoneCall size={20} />
                      </a>
                      <a 
                        href={`https://zalo.me/${lead.phone.replace(/^0/, '84')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-blue-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                        title="Chat Zalo"
                      >
                        <MessageCircle size={20} />
                      </a>
                   </div>

                   <button 
                    onClick={() => updateStatus(lead.id, lead.status === 'done' ? 'new' : 'done')}
                    disabled={updatingId === lead.id}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                      lead.status === 'done' 
                        ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-95'
                    )}
                   >
                     {updatingId === lead.id ? <Loader2 size={16} className="animate-spin" /> : (lead.status === 'done' ? <Clock size={16} /> : <CheckCircle2 size={16} />)}
                     <span className="hidden sm:inline">{lead.status === 'done' ? 'Phục hồi' : 'Xong'}</span>
                   </button>
                   
                   <div className="w-[1px] h-8 bg-slate-200 mx-2 hidden sm:block"></div>

                   <button 
                    onClick={() => deleteLead(lead.id)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
