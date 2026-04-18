'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, CheckCircle, Play, Layers, Briefcase, Globe } from 'lucide-react';

export default function KeywordManagement() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  
  // States cho Form thêm mới
  const [newKw, setNewKw] = useState({ keyword: '', intent: 'info', level: 'industry', industry: 'spa', weight: 1.0 });

  // States cho Preview Real-time
  const [testInput, setTestInput] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);

  useEffect(() => {
    fetchKeywords();
  }, [filterIndustry, filterLevel]);

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      let query = supabase.from('keywords').select('*').order('created_at', { ascending: false });
      
      if (filterIndustry !== 'all') query = query.eq('industry', filterIndustry);
      if (filterLevel !== 'all') query = query.eq('level', filterLevel);

      const { data, error } = await query;
      if (error) throw error;
      setKeywords(data || []);
    } catch (e) {
      console.error('Lỗi tải từ khóa:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKw.keyword) return;
    const { error } = await supabase.from('keywords').insert([newKw]);
    if (error) alert(error.message);
    else {
      setNewKw({ ...newKw, keyword: '' });
      fetchKeywords();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Xóa từ khóa này?')) return;
    await supabase.from('keywords').delete().eq('id', id);
    fetchKeywords();
  };

  // 🧪 HÀM PREVIEW REAL-TIME (Mô phỏng logic của Engine)
  const runPreview = () => {
    if (!testInput) return;
    const normalized = testInput.toLowerCase();
    const matched: string[] = [];
    const intentScores: Record<string, number> = {};

    keywords.forEach((kw: any) => {
      if (kw.is_active && normalized.includes(kw.keyword.toLowerCase())) {
        matched.push(kw.keyword);
        intentScores[kw.intent] = (intentScores[kw.intent] || 0) + (parseFloat(kw.weight) || 1);
      }
    });

    const bestIntent = Object.entries(intentScores).sort((a,b) => b[1] - a[1])[0];
    
    setPreviewResult({
      bestIntent: bestIntent ? bestIntent[0] : 'unknown',
      score: bestIntent ? bestIntent[1] : 0,
      matched
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-black flex items-center gap-2"><Globe className="text-blue-600" /> Hệ Thống Quản Trị Từ Khóa (3-Layer)</h2>
         <div className="flex gap-2">
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-white border rounded-lg px-3 py-1 text-xs font-bold">
               <option value="all">Tất cả cấp độ</option>
               <option value="global">Global</option>
               <option value="industry">Industry</option>
               <option value="shop">Shop</option>
            </select>
            <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="bg-white border rounded-lg px-3 py-1 text-xs font-bold">
               <option value="all">Tất cả ngành</option>
               <option value="spa">Spa / Beauty</option>
               <option value="fnb">F&B / Nhà hàng</option>
               <option value="retail">Retail / Bán lẻ</option>
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1: THÊM MỚI TỪ KHÓA */}
        <div className="bg-white p-5 rounded-3xl border shadow-sm space-y-4 shadow-slate-200">
           <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Plus size={14}/> Thêm Tri Thức Mới</h3>
           <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Ví dụ: giá, bao nhiêu, menu..." 
                className="w-full border border-slate-100 bg-slate-50/50 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                value={newKw.keyword}
                onChange={e => setNewKw({...newKw, keyword: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-2">
                 <select value={newKw.intent} onChange={e => setNewKw({...newKw, intent: e.target.value})} className="border border-slate-100 bg-slate-50/50 rounded-xl p-2 text-xs font-bold">
                    <option value="pricing">Pricing (Giá)</option>
                    <option value="booking">Booking (Đặt lịch)</option>
                    <option value="info">Info (Thông tin)</option>
                    <option value="complaint">Complaint (Khiếu nại)</option>
                 </select>
                 <select value={newKw.industry} onChange={e => setNewKw({...newKw, industry: e.target.value})} className="border border-slate-100 bg-slate-50/50 rounded-xl p-2 text-xs font-bold">
                    <option value="spa">Ngành Spa</option>
                    <option value="fnb">Ngành F&B</option>
                    <option value="retail">Ngành Bán lẻ</option>
                    <option value="general">Chung</option>
                 </select>
              </div>
              <div className="flex gap-2">
                 <select value={newKw.level} onChange={e => setNewKw({...newKw, level: e.target.value})} className="flex-1 border border-blue-100 bg-blue-50/50 rounded-xl p-2 text-xs font-bold text-blue-700">
                    <option value="global">Cấp độ Global</option>
                    <option value="industry">Cấp độ Industry</option>
                    <option value="shop">Cấp độ Shop</option>
                 </select>
                 <input type="number" step="0.1" value={newKw.weight} onChange={e => setNewKw({...newKw, weight: parseFloat(e.target.value)})} className="w-16 border border-slate-100 bg-slate-50/50 rounded-xl p-2 text-center text-xs" title="Weight Trọng số" />
              </div>
              <button onClick={handleAdd} className="w-full bg-slate-900 text-white rounded-xl py-4 text-xs font-black hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all uppercase tracking-widest">LƯU VÀO HỆ THỐNG</button>
           </div>

           <div className="pt-4 border-t border-dashed border-slate-200">
              <h3 className="text-[10px] font-black uppercase text-indigo-500 mb-3 flex items-center gap-2"><Play size={12}/> Preview Real-time</h3>
              <div className="space-y-2">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Nhập câu hỏi để test..." 
                      className="flex-1 border border-indigo-100 bg-indigo-50/30 rounded-xl p-2.5 text-xs font-medium" 
                      value={testInput}
                      onChange={e => setTestInput(e.target.value)}
                    />
                    <button onClick={runPreview} className="bg-indigo-600 text-white px-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"><Search size={14}/></button>
                 </div>
                 {previewResult && (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 text-[11px] space-y-2 animate-in fade-in zoom-in duration-300 shadow-sm">
                       <div className="flex justify-between font-bold">
                          <span className="text-slate-400 uppercase text-[9px]">Kết quả Intent:</span>
                          <span className="text-indigo-600 px-2 bg-indigo-50 rounded uppercase">{previewResult.bestIntent}</span>
                       </div>
                       <div className="flex justify-between font-bold">
                          <span className="text-slate-400 uppercase text-[9px]">Tổng Score:</span>
                          <span className="text-slate-800">{previewResult.score}</span>
                       </div>
                       <div className="flex flex-wrap gap-1">
                          {previewResult.matched.map((m: any, idx: number) => (
                             <span key={idx} className="bg-emerald-50 border px-1.5 py-0.5 rounded text-[9px] text-emerald-600 font-bold border-emerald-100">+{m}</span>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* CỘT 2-3: DANH SÁCH TỪ KHÓA HIỆN CÓ */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
           <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b">
                 <tr>
                    <th className="p-4">Keyword</th>
                    <th className="p-4">Intent</th>
                    <th className="p-4">Cấu hình tầng</th>
                    <th className="p-4 text-center">Hành động</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {keywords.map((kw: any) => (
                    <tr key={kw.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="p-4 font-black text-slate-700">{kw.keyword}</td>
                       <td className="p-4">
                          <span className="bg-slate-100 group-hover:bg-white px-2 py-1 rounded-full text-[10px] font-bold uppercase text-slate-500 border border-transparent group-hover:border-slate-100">{kw.intent}</span>
                       </td>
                       <td className="p-4 text-[10px] space-y-1">
                          <div className="flex items-center gap-1.5">
                             {kw.level === 'global' ? <Globe size={11} className="text-blue-500"/> : (kw.level === 'industry' ? <Briefcase size={11} className="text-indigo-500"/> : <Layers size={11} className="text-amber-500"/>)}
                             <span className="font-bold text-slate-600 uppercase tracking-tighter">{kw.level} - {kw.industry}</span>
                          </div>
                          <div className="text-slate-400">Weight: <strong className="text-slate-600">{kw.weight}</strong> | Ver: <strong className="text-slate-600">{kw.version}</strong></div>
                       </td>
                       <td className="p-4 flex gap-2 justify-center">
                          <button onClick={() => handleDelete(kw.id)} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={15}/></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           {keywords.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                 <Globe size={48} className="mb-4" />
                 <p className="text-sm font-black uppercase">Chưa có dữ liệu từ khóa</p>
                 <p className="text-xs">Bắt đầu xây dựng bộ tri thức mẫu tại cột bên trái</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
