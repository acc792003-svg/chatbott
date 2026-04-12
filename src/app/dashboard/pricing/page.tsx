'use client';

import { Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Gói Miễn Phí',
    price: '0đ',
    description: 'Dành cho cá nhân mới kinh doanh.',
    features: ['50 tin nhắn AI mỗi ngày', '1 Chatbot cơ bản', 'Lịch sử 7 ngày', 'Hỗ trợ cộng đồng'],
    current: true,
  },
  {
    name: 'Gói Pro',
    price: '299.000đ',
    description: 'Dành cho shop bán hàng chuyên nghiệp.',
    features: ['Tin nhắn không giới hạn', 'Tích hợp FB Webhook', 'Lịch sử vĩnh viễn', 'Ưu tiên hỗ trợ 24/7', 'Phân tích dữ liệu chuyên sâu'],
    current: false,
    popular: true,
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gói Dịch Vụ</h1>
        <p className="text-slate-500 font-medium">Chọn gói phù hợp để tối ưu công việc kinh doanh của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-8">
        {tiers.map((tier) => (
          <div 
            key={tier.name} 
            className={cn(
              "glass p-10 rounded-[3rem] relative flex flex-col transition-all duration-500",
              tier.popular ? "ring-4 ring-blue-500/20 scale-105 shadow-2xl z-10" : "hover:scale-[1.02]"
            )}
          >
            {tier.popular && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Phổ biến nhất
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{tier.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{tier.price}</span>
                <span className="text-slate-500 font-bold">/tháng</span>
              </div>
              <p className="text-sm text-slate-500 mt-4 font-medium leading-relaxed">{tier.description}</p>
            </div>

            <div className="space-y-4 mb-10 flex-1">
              {tier.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center", tier.popular ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                tier.popular 
                  ? "btn-gradient shadow-blue-200" 
                  : "bg-white border-2 border-slate-200 text-slate-900 hover:border-slate-300"
              )}
            >
              {tier.current ? 'Đang sử dụng' : (
                <span className="flex items-center justify-center gap-2">
                  <Zap size={18} /> Mua ngay
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
