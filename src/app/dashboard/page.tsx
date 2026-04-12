'use client';

import { 
  MessageSquare, 
  Users, 
  Zap, 
  TrendingUp, 
  ArrowUpRight 
} from 'lucide-react';

const stats = [
  { name: 'Tin nhắn hôm nay', value: '1,284', change: '+12.5%', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Khách hàng', value: '52', change: '+5.2%', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { name: 'Lượt AI đã dùng', value: '48/50', change: 'Gần hết', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
];

export default function DashboardOverview() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tổng Quan</h1>
        <p className="text-slate-500 font-medium">Chào buổi sáng, đây là hiệu suất chatbot của bạn hôm nay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
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
        <div className="glass p-8 rounded-[2.5rem] h-96 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
             <TrendingUp size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Biểu đồ đang phát triển</h3>
          <p className="text-sm text-slate-500 max-w-xs">Chúng tôi đang xử lý dữ liệu để hiển thị biểu đồ tăng trưởng của bạn trong 7 ngày qua.</p>
        </div>

        <div className="glass p-8 rounded-[2.5rem] h-96">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hoạt động gần đây</h3>
              <button className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                Xem tất cả <ArrowUpRight size={14} />
              </button>
           </div>
           <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold text-xs">K{i}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Khách hàng mới: User {120 + i}</p>
                    <p className="text-[11px] text-slate-500">Đã hỏi về giá sản phẩm • 2 phút trước</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
