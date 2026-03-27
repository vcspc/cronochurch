'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Calendar as CalendarIcon, ArrowLeft, MoreVertical, Clock } from 'lucide-react';
import { ScheduleCard } from '@/components/ScheduleCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function SchedulesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'schedules'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] pb-24">
      <header className="pt-12 px-6 pb-6 flex items-center gap-4">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Cronogramas</h1>
      </header>

      <div className="px-6 space-y-4">
        {schedules.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-around items-center z-40">
        <Link href="/" className="flex flex-col items-center text-[#9CA3AF]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Início</span>
        </Link>
        <Link href="/schedules" className="flex flex-col items-center text-[#e6614c]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Cronogramas</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-[#9CA3AF]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
