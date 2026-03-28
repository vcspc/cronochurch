'use client';

import { useState, useEffect, use } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Edit3, Save, X, Plus, Trash2, History, Clock, Link as LinkIcon, CheckCircle, GripVertical } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lock, setLock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (id === 'new') {
      setSchedule({ title: '', date: format(new Date(), 'yyyy-MM-dd'), items: [] });
      setIsEditing(true);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'schedules', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchedule({ id: docSnap.id, ...data });
        setTitle(data.title);
        setDate(data.date);
        setItems(data.items || []);
      } else {
        toast.error('Cronograma não encontrado.');
        router.push('/');
      }
      setLoading(false);
    });

    const lockUnsub = onSnapshot(doc(db, 'locks', id), (docSnap) => {
      if (docSnap.exists()) {
        const lockData = docSnap.data();
        if (lockData.expiresAt.toDate() > new Date()) {
          setLock(lockData);
        } else {
          setLock(null);
        }
      } else {
        setLock(null);
      }
    });

    return () => {
      unsub();
      lockUnsub();
    };
  }, [id, router]);

  const handleSave = async () => {
    if (!user) return;
    if (!title || !date) {
      toast.error('Título e data são obrigatórios.');
      return;
    }

    const scheduleData = { title, date, items, isTemplate, updatedAt: serverTimestamp() };

    try {
      const collectionName = isTemplate ? 'templates' : 'schedules';
      if (id === 'new') {
        const docRef = await addDoc(collection(db, collectionName), { ...scheduleData, createdBy: user.uid, createdAt: serverTimestamp() });
        await addDoc(collection(db, 'history'), { scheduleId: docRef.id, userId: user.uid, userName: user.displayName || 'Usuário', action: 'create', details: `Criou o ${isTemplate ? 'modelo' : 'cronograma'} "${title}"`, timestamp: serverTimestamp() });
        toast.success(isTemplate ? 'Modelo criado!' : 'Cronograma criado!');
        router.push(isTemplate ? '/templates' : `/schedule/${docRef.id}`);
      } else {
        await updateDoc(doc(db, collectionName, id), scheduleData);
        await addDoc(collection(db, 'history'), { scheduleId: id, userId: user.uid, userName: user.displayName || 'Usuário', action: 'update', details: `Editou o ${isTemplate ? 'modelo' : 'cronograma'} "${title}"`, timestamp: serverTimestamp() });
        toast.success('Salvo com sucesso!');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('Erro ao salvar.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] flex flex-col">
      <header className={`sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm ${isEditing ? 'bg-[#E2A065] text-white' : 'bg-white'}`}>
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col items-center">
          <span className="font-bold text-sm">{isEditing ? 'Editando Cronograma' : 'Visualizando Cronograma'}</span>
        </div>
        <div className="w-10 h-10 flex items-center justify-center">
          {id !== 'new' && (
            <button onClick={() => setShowHistory(!showHistory)} className="hover:bg-black/5 p-2 rounded-full">
              <History size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-6 pb-32">
        {isEditing ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="relative bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-[#e6614c] uppercase">Título do Culto</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Culto de Celebração" className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 p-0 mt-1" />
              </div>
              <div className="relative bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-[#e6614c] uppercase">Data e Hora</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-none text-lg focus:ring-0 p-0 mt-1" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-[#4A3F35] leading-tight mb-2">{schedule?.title}</h1>
              <p className="text-[#e6614c] font-bold text-lg">{schedule?.date}</p>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 flex gap-4 max-w-lg mx-auto w-full z-40">
        {isEditing ? (
          <button onClick={handleSave} className="flex-1 bg-[#e6614c] text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90">
            <Save size={20} /> Salvar
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="flex-1 bg-[#e6614c] text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2 py-4 hover:opacity-90">
            <Edit3 size={20} /> Editar Cronograma
          </button>
        )}
      </footer>
    </div>
  );
}
