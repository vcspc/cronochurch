'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'motion/react';
import { ArrowLeft, History as HistoryIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'history'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-6 py-4 flex items-center gap-4 shadow-sm">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Histórico de Atividades</h1>
      </header>

      <main className="max-w-lg mx-auto p-6">
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
              <HistoryIcon size={48} className="mx-auto text-[#9CA3AF] mb-4 opacity-20" />
              <p className="text-[#9CA3AF]">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            history.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#e6614c] font-bold shrink-0">
                  {item.userName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-[#4A3F35]">{item.userName}</span>
                    <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                      <Clock size={10} />
                      {item.timestamp?.toDate() && format(item.timestamp.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-[#4A3F35] leading-relaxed">
                    {item.details}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
