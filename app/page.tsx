'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, signInWithGoogle, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bell, Music, Users, BookOpen, Calendar as CalendarIcon, LogOut, ChevronRight, MoreVertical, Clock, Eye, Edit, Trash2, History } from 'lucide-react';
import { ScheduleCard } from '@/components/ScheduleCard';
import { TemplateCard } from '@/components/TemplateCard';
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

  const handleCreateFromTemplate = async (template: any) => {
    if (!user) return;
    try {
      const newSchedule = {
        ...template,
        title: `${template.title} (Cópia)`,
        date: format(new Date(), 'yyyy-MM-dd'),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      delete newSchedule.id;
      const docRef = await addDoc(collection(db, 'schedules'), newSchedule);
      toast.success('Cronograma criado a partir do modelo!');
      router.push(`/schedule/${docRef.id}`);
    } catch (error) {
      toast.error('Erro ao criar cronograma.');
    }
  };

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

      {/* Templates Carousel */}
      <section className="mb-8">
        <div className="px-6 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Modelos rápidos</h2>
          <Link href="/templates" className="text-[#e6614c] text-sm font-medium hover:underline">Ver todos</Link>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar px-6 gap-4 pb-4 snap-x">
          {/* Add Template Card */}
          <Link 
            href="/template/new"
            className="snap-start shrink-0 w-[140px] h-[100px] bg-white border-2 border-dashed border-[#9CA3AF] rounded-2xl p-4 flex flex-col justify-center items-center text-[#9CA3AF] hover:text-[#e6614c] hover:border-[#e6614c] transition-all gap-1"
          >
            <Plus size={24} />
            <span className="font-bold text-xs">Novo Modelo</span>
          </Link>

          {/* Default Templates if none exist */}
          {templates.length === 0 && (
            <>
              <TemplateCard 
                icon={<Music size={24} />} 
                template={{ title: "Culto de Domingo" }}
                color="bg-[#829C8B]" 
                onSelect={() => toast('Crie um cronograma primeiro para salvar como modelo!')}
              />
              <TemplateCard 
                icon={<Users size={24} />} 
                template={{ title: "Reunião de Jovens" }}
                color="bg-[#E2A065]" 
                onSelect={() => toast('Crie um cronograma primeiro para salvar como modelo!')}
              />
              <TemplateCard 
                icon={<BookOpen size={24} />} 
                template={{ title: "Escola Bíblica" }}
                color="bg-[#8FA3C4]" 
                onSelect={() => toast('Crie um cronograma primeiro para salvar como modelo!')}
              />
            </>
          )}
          {templates.map((template) => (
            <TemplateCard 
              key={template.id}
              template={template}
              onSelect={handleCreateFromTemplate}
            />
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mb-8 px-6">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Atividade recente</h2>
          <Link href="/history" className="text-[#e6614c] text-sm font-medium hover:underline flex items-center gap-1">
            Ver tudo
            <ChevronRight size={14} />
          </Link>
        </div>
        <div className="bg-white rounded-3xl p-4 shadow-sm space-y-4">
          {recentHistory.length === 0 ? (
            <p className="text-center text-[#9CA3AF] py-4 text-sm">Nenhuma atividade recente.</p>
          ) : (
            recentHistory.map((item) => (
              <div key={item.id} className="flex items-start gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#e6614c] font-bold text-xs shrink-0">
                  {item.userName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#4A3F35] leading-tight">
                    <span className="font-bold">{item.userName}</span> {item.details}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">
                    {item.timestamp?.toDate() && format(item.timestamp.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Upcoming Schedules */}
      <section className="px-6 flex-1">
        <h2 className="text-lg font-semibold mb-4">Próximos cultos</h2>
        <div className="flex flex-col gap-4">
          {schedules.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-[#9CA3AF]">
              <p className="text-[#9CA3AF]">Nenhum cronograma criado ainda.</p>
              <Link href="/schedule/new" className="text-[#e6614c] font-bold mt-2 block">Criar o primeiro</Link>
            </div>
          ) : (
            schedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))
          )}
        </div>
      </section>

      {/* FAB */}
      <Link 
        href="/schedule/new"
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#e6614c] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50"
      >
        <Plus size={32} />
      </Link>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-around items-center z-40">
        <Link href="/" className="flex flex-col items-center text-[#e6614c]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Início</span>
        </Link>
        <Link href="/schedules" className="flex flex-col items-center text-[#9CA3AF]">
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold mt-1">Cronogramas</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-[#9CA3AF]">
          <Users size={24} />
          <span className="text-[10px] font-bold mt-1">Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
