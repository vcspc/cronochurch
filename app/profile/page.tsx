'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Calendar as CalendarIcon, ArrowLeft, LogOut, User as UserIcon, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] pb-24">
      <header className="pt-12 px-6 pb-6 flex items-center gap-4">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
      </header>

      <div className="px-6 space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-[#e6614c]/10 flex items-center justify-center text-[#e6614c] font-bold text-4xl mb-4">
            {user.displayName?.charAt(0) || user.email?.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold">{user.displayName || 'Usuário'}</h2>
          <p className="text-[#9CA3AF]">{user.email}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4 p-2">
            <UserIcon size={20} className="text-[#9CA3AF]" />
            <div className="flex-1">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase">Nome</p>
              <p className="font-bold">{user.displayName || 'Não definido'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-2">
            <Mail size={20} className="text-[#9CA3AF]" />
            <div className="flex-1">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase">E-mail</p>
              <p className="font-bold">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-2">
            <Shield size={20} className="text-[#9CA3AF]" />
            <div className="flex-1">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase">Função</p>
              <p className="font-bold">Colaborador</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="w-full py-4 bg-white text-red-500 rounded-full font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-around items-center z-40">
        <Link href="/" className="flex flex-col items-center text-[#9CA3AF]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Início</span>
        </Link>
        <Link href="/schedules" className="flex flex-col items-center text-[#9CA3AF]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Cronogramas</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-[#e6614c]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
