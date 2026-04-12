'use client';

import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';

const history = [
  { id: '1', customer: 'Lê Văn A', preview: 'Cho mình hỏi giá sản phẩm yến sào...', date: '12/04/2026', time: '10:30', status: 'Đã trả lời' },
  { id: '2', customer: 'Nguyễn Thị B', preview: 'Shop có miễn phí ship không?', date: '12/04/2026', time: '09:15', status: 'Đã trả lời' },
  { id: '3', customer: 'Trần C', preview: 'Mình muốn đặt hàng 2 hộp yến...', date: '11/04/2026', time: '22:45', status: 'Đã trả lời' },
];

export default function HistoryPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lịch Sử Trò Chuyện</h1>
          <p className="text-slate-500 font-medium">Toàn bộ cuộc hội thoại của AI với khách hàng.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={16} /> Lọc
          </button>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] overflow-hidden shadow-xl border-white/40">
        <div className="p-4 bg-white/50 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo tên khách hàng hoặc nội dung..." 
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Khách hàng</th>
                <th className="px-8 py-4">Xem trước tin nhắn</th>
                <th className="px-8 py-4">Thời gian</th>
                <th className="px-8 py-4">Trạng thái</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-white/40 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {h.customer[0]}
                      </div>
                      <span className="font-bold text-sm text-slate-900">{h.customer}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm text-slate-500 truncate max-w-xs italic line-clamp-1">{h.preview}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-900">{h.time}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{h.date}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight">
                      {h.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                      <ArrowRight size={20} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
