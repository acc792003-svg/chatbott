'use client';

import Link from 'next/link';
import { Bot, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen selection:bg-blue-100 flex flex-col items-center">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full"></div>
      </div>

      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Bot size={24} />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">AI Chat</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Tính năng</Link>
          <Link href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Bảng giá</Link>
          <Link href="/dashboard" className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all">
            Đăng nhập
          </Link>
        </div>
      </nav>

      <main className="w-full max-w-5xl px-8 pt-24 pb-32 text-center space-y-12">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-bounce">
          <Sparkles size={14} />
          AI Đã Sẵn Sàng Bán Hàng Cho Bạn
        </div>
        
        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1]">
          Biến Khách Truy Tập Thành <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Đơn Hàng Thực Tế</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          Nền tảng AI Chatbot thông minh giúp bạn tư vấn khách hàng 24/7, tự động chốt đơn và tăng doanh thu vượt trội cho doanh nghiệp vừa và nhỏ.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/dashboard" className="btn-gradient px-10 py-5 rounded-[2rem] text-lg flex items-center gap-2 group shadow-2xl shadow-blue-200">
            Dùng Thử Miễn Phí
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="bg-white border border-slate-200 text-slate-900 px-10 py-5 rounded-[2rem] text-lg font-bold hover:bg-slate-50 transition-all">
            Xem Demo
          </button>
        </div>

        <div className="pt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Tự Động 24/7', desc: 'Không bao giờ bỏ lỡ tin nhắn khách hàng.' },
            { title: 'Dễ Cấu Hình', desc: 'Chỉ mất 5 phút để huấn luyện AI của bạn.' },
            { title: 'Đa Nền Tảng', desc: 'Sắp ra mắt tích hợp FB, Zalo, Website.' },
          ].map((f, i) => (
            <div key={i} className="glass p-8 rounded-[2.5rem] text-left space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{f.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="w-full border-t border-slate-100 py-12 flex flex-col items-center">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© 2026 AI Chat Bán Hàng • Premium SaaS Solution</p>
      </footer>
    </div>
  );
}
