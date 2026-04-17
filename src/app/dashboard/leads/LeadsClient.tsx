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
  Loader2
} from 'lucide-react';

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

  if (loading) return <div className="flex h-64 justify-center items-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Khách Hàng Tiềm Năng</h1>
          <p className="text-slate-500 font-medium">Danh sách khách hàng để lại số điện thoại qua Chatbot.</p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl font-bold flex items-center gap-2">
          <Users size={20} />
          {leads.length} khách hàng
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {leads.length === 0 ? (
          <div className="glass p-20 rounded-[3rem] text-center space-y-4">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Phone size={32} />
             </div>
             <p className="text-slate-500 font-medium">Chưa có khách hàng nào để lại số điện thoại.</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="glass p-6 rounded-[2rem] hover:shadow-xl transition-all border border-slate-100 group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    lead.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <Phone size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{lead.phone}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <Calendar size={12} />
                        {new Date(lead.created_at).toLocaleString('vi-VN')}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        lead.status === 'done' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {lead.status === 'done' ? 'Đã xử lý' : 'Mới'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-md bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                      <MessageSquare size={10} /> Tin nhắn gốc
                   </div>
                   <p className="text-sm text-slate-600 italic line-clamp-2">"{lead.first_message}"</p>
                </div>

                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => updateStatus(lead.id, lead.status === 'done' ? 'new' : 'done')}
                    disabled={updatingId === lead.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      lead.status === 'done' 
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100'
                    }`}
                   >
                     {updatingId === lead.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                     {lead.status === 'done' ? 'Đánh dấu chưa xử lý' : 'Đã liên hệ'}
                   </button>
                   
                   <a 
                    href={`/dashboard/history?session=${lead.session_id}`}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    title="Xem hội thoại"
                   >
                     <ExternalLink size={20} />
                   </a>

                   <button 
                    onClick={() => deleteLead(lead.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
