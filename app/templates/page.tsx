'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ArrowLeft, Plus, Music, Users, BookOpen } from 'lucide-react';
import { TemplateCard } from '@/components/TemplateCard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TemplatesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const tq = query(collection(db, 'templates'));
    const tUnsubscribe = onSnapshot(tq, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(docs);
      setLoading(false);
    });

    return () => tUnsubscribe();
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
        <h1 className="text-2xl font-bold mb-4">Faça login para ver seus modelos</h1>
        <Link href="/" className="text-[#e6614c] font-bold">Voltar para o início</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] pb-24">
      <header className="pt-12 px-6 pb-6 flex items-center gap-4 sticky top-0 bg-[#FAF6F0]/80 backdrop-blur-md z-30">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Todos os Modelos</h1>
      </header>

      <main className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Add Template Card */}
          <Link 
            href="/template/new"
            className="w-full h-[120px] bg-white border-2 border-dashed border-[#9CA3AF] rounded-2xl p-4 flex flex-col justify-center items-center text-[#9CA3AF] hover:text-[#e6614c] hover:border-[#e6614c] transition-all gap-2"
          >
            <Plus size={32} />
            <span className="font-bold">Novo Modelo</span>
          </Link>

          {templates.map((template) => (
            <div key={template.id} className="w-full">
              <TemplateCard 
                template={template}
                onSelect={handleCreateFromTemplate}
                color={template.color || "bg-[#829C8B]"}
              />
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="mt-12 text-center space-y-4">
            <p className="text-[#9CA3AF]">Você ainda não criou nenhum modelo personalizado.</p>
            <div className="flex flex-col gap-4 items-center">
              <p className="text-sm font-bold text-[#4A3F35]">Modelos Sugeridos:</p>
              <div className="flex gap-4 overflow-x-auto w-full justify-center pb-4">
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
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
