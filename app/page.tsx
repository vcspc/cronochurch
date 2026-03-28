'use client';

import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bell, Music, Users, BookOpen, Calendar as CalendarIcon, LogOut, ChevronRight, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'schedules'), orderBy('date', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(docs);
    });

    const tq = query(collection(db, 'templates'), limit(5));
    const tUnsubscribe = onSnapshot(tq, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(docs);
    });

    const hq = query(collection(db, 'history'), orderBy('timestamp', 'desc'), limit(5));
    const hUnsubscribe = onSnapshot(hq, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentHistory(docs);
    });

    return () => {
      unsubscribe();
      tUnsubscribe();
      hUnsubscribe();
    };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">Carregando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6F0] p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl"
        >
          <h1 className="text-3xl font-bold text-[#4A3F35] mb-4">Bem-vindo à Comunidade</h1>
          <p className="text-[#9CA3AF] mb-8">Faça login para começar a organizar seus cultos e colaborar com sua equipe.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-4 bg-[#e6614c] text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-3"
          >
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] pb-24">
      {/* Header */}
      <header className="pt-12 px-6 pb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Bom dia, {user.displayName?.split(' ')[0]}</h1>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Bell size={20} />
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-red-500"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
        <p className="text-[#9CA3AF] text-base">Prontos para organizar mais uma semana?</p>
      </header>

      {/* Main Content */}
      <main className="px-6">
        <h2 className="text-lg font-semibold mb-4">Próximos cultos</h2>
        <div className="flex flex-col gap-4">
          {schedules.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-[#9CA3AF]">
              <p className="text-[#9CA3AF]">Nenhum cronograma criado ainda.</p>
              <Link href="/schedule/new" className="text-[#e6614c] font-bold mt-2 block">Criar o primeiro</Link>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold">{schedule.title}</h3>
                <p className="text-sm text-[#9CA3AF]">{schedule.date}</p>
              </div>
            ))
          )}
        </div>
      </main>

      {/* FAB */}
      <Link 
        href="/schedule/new"
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#e6614c] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50"
      >
        <Plus size={32} />
      </Link>
    </div>
  );
}
