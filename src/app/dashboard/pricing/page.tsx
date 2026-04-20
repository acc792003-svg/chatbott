'use client';

import { useState } from 'react';
import { Check, Zap, Rocket, Star, ShieldCheck, BellRing, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Gói Khởi Đầu',
    price: '0đ',
    description: 'Trải nghiệm sức mạnh của trợ lý ảo hoàn toàn miễn phí.',
    features: [
      'Trợ lý ảo phản hồi cơ bản',
      'Giới hạn 30 tin nhắn mỗi ngày',
      'Lưu lịch sử nhắn tin 3 ngày',
      'Giao diện khung chat tiêu chuẩn',
      'Hỗ trợ qua cộng đồng'
    ],
    current: true,
    buttonText: 'Đang sử dụng',
    color: 'slate'
  },
  {
    name: 'Gói Chuyên Nghiệp',
    price: '149.000đ',
    description: 'Giải pháp bán hàng tự động toàn diện cho shop.',
    features: [
      'Trợ lý ảo thông minh 24/7',
      'Luyện tri thức riêng theo shop',
      'Tự động lấy số điện thoại khách',
      'Báo khách mới về Telegram ngay',
      'Quản lý danh sách khách hàng',
      'Xóa dòng chữ thương hiệu',
      'Ưu tiên hỗ trợ riêng 1-1'
    ],
    current: false,
    popular: true,
    buttonText: 'Nâng cấp ngay',
    color: 'blue'
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
          <Star size={14} fill="currentColor" /> Bán hàng hiệu quả hơn với trợ lý ảo
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Chọn Gói Dịch Vụ <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Phù Hợp Cho Shop</span>
        </h1>
        <p className="text-slate-500 font-medium text-lg leading-relaxed">
          Tối ưu hóa quy trình bán hàng, không bỏ lỡ bất kỳ khách hàng nào kể cả khi bạn đang ngủ.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-6">
        {tiers.map((tier) => (
          <div 
            key={tier.name} 
            className={cn(
              "glass p-1 rounded-[3rem] relative transition-all duration-500",
              tier.popular ? "bg-gradient-to-b from-blue-500/20 to-indigo-500/20 shadow-2xl scale-[1.02]" : "hover:scale-[1.01]"
            )}
          >
            <div className="bg-white rounded-[2.9rem] p-10 h-full flex flex-col relative overflow-hidden">
              {/* Decorative elements */}
              {tier.popular && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              )}

              {tier.popular && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-2.5 rounded-b-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-lg">
                  Lựa chọn tốt nhất
                </div>
              )}

              <div className="mb-10 text-center md:text-left">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm",
                  tier.popular ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {tier.popular ? <Rocket size={24} /> : <Users size={24} />}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{tier.name}</h3>
                <div className="flex items-baseline justify-center md:justify-start gap-1">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{tier.price}</span>
                  <span className="text-slate-400 font-bold text-lg">/tháng</span>
                </div>
                <p className="text-sm text-slate-500 mt-4 font-medium leading-relaxed">{tier.description}</p>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 group">
                    <div className={cn(
                      "mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors", 
                      tier.popular ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" : "bg-slate-50 text-slate-400"
                    )}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-[15px] font-bold text-slate-700 leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                className={cn(
                  "w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl",
                  tier.popular 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-200" 
                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-100"
                )}
              >
                {tier.current ? (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck size={18} /> {tier.buttonText}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap size={18} fill="currentColor" /> {tier.price === '0đ' ? 'Bắt đầu ngay' : tier.buttonText}
                  </span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Advantage Footer */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 px-4">
          <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-2">
                  <BellRing size={28} />
              </div>
              <h4 className="font-black text-slate-800">Thông báo tức thì</h4>
              <p className="text-sm text-slate-500 font-medium">Báo ngay tên và số điện thoại khách hàng về điện thoại qua Telegram.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-2">
                  <span className="text-2xl font-black">24h</span>
              </div>
              <h4 className="font-black text-slate-800">Hoạt động xuyên suốt</h4>
              <p className="text-sm text-slate-500 font-medium">Trình trợ lý không nghỉ ngơi, trực shop và trả lời khách bất kể đêm ngày.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-2">
                  <Users size={28} />
              </div>
              <h4 className="font-black text-slate-800">Quản lý khách hàng</h4>
              <p className="text-sm text-slate-500 font-medium">Toàn bộ thông tin khách hàng được lưu trữ khoa học, dễ dàng tìm kiếm.</p>
          </div>
      </div>
    </div>
  );
}
