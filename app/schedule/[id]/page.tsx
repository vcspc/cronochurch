'use client';

import { useState, useEffect, use } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, collection, addDoc, serverTimestamp, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Share2, Edit3, Save, X, Plus, Trash2, History, Clock, Link as LinkIcon, CheckCircle, GripVertical } from 'lucide-react';
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
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (id === 'new') {
      const initNew = () => {
        setSchedule({ title: '', date: format(new Date(), 'yyyy-MM-dd'), items: [] });
        setIsEditing(true);
        setLoading(false);
      };
      initNew();
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

  const acquireLock = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para editar.');
      return false;
    }
    if (lock && lock.userId !== user.uid) {
      toast.error(`Este cronograma está sendo editado por ${lock.userName}.`);
      return false;
    }

    try {
      await setDoc(doc(db, 'locks', id), {
        scheduleId: id,
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        expiresAt: addMinutes(new Date(), 10),
      });
      return true;
    } catch (error) {
      toast.error('Erro ao adquirir trava de edição.');
      return false;
    }
  };

  const releaseLock = async () => {
    if (id === 'new') return;
    try {
      await deleteDoc(doc(db, 'locks', id));
    } catch (error) {
      console.error('Error releasing lock:', error);
    }
  };

  const handleStartEdit = async () => {
    const success = await acquireLock();
    if (success) setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title || !date) {
      toast.error('Título e data são obrigatórios.');
      return;
    }

    const scheduleData = {
      title,
      date,
      items,
      isTemplate,
      updatedAt: serverTimestamp(),
    };

    try {
      const collectionName = isTemplate ? 'templates' : 'schedules';
      if (id === 'new') {
        const docRef = await addDoc(collection(db, collectionName), {
          ...scheduleData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'history'), {
          scheduleId: docRef.id,
          userId: user.uid,
          userName: user.displayName || 'Usuário',
          action: 'create',
          details: `Criou o ${isTemplate ? 'modelo' : 'cronograma'} "${title}"`,
          timestamp: serverTimestamp(),
        });
        toast.success(isTemplate ? 'Modelo criado!' : 'Cronograma criado!');
        router.push(isTemplate ? '/templates' : `/schedule/${docRef.id}`);
      } else {
        await updateDoc(doc(db, collectionName, id), scheduleData);
        await addDoc(collection(db, 'history'), {
          scheduleId: id,
          userId: user.uid,
          userName: user.displayName || 'Usuário',
          action: 'update',
          details: `Editou o ${isTemplate ? 'modelo' : 'cronograma'} "${title}"`,
          timestamp: serverTimestamp(),
        });
        toast.success('Salvo com sucesso!');
        setIsEditing(false);
        await releaseLock();
      }
    } catch (error) {
      toast.error('Erro ao salvar.');
    }
  };

  const handleAddItem = (item: any) => {
    if (editingItem) {
      setItems(items.map(i => i.id === editingItem.id ? item : i));
    } else {
      setItems([...items, { ...item, id: uuidv4() }]);
    }
    setShowItemModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#4A3F35] flex flex-col">
      {/* Header */}
      <header className={`sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm ${isEditing ? 'bg-[#E2A065] text-white' : 'bg-white'}`}>
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col items-center">
          <span className="font-bold text-sm">
            {isEditing ? 'Editando Cronograma' : 'Visualizando Cronograma'}
          </span>
          {lock && !isEditing && (
            <span className="text-[10px] opacity-80">Sendo editado por {lock.userName}</span>
          )}
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
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Culto de Celebração"
                  className="w-full bg-transparent border-none text-xl font-bold focus:ring-0 p-0 mt-1"
                />
              </div>
              <div className="relative bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-[#e6614c] uppercase">Data e Hora</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border-none text-lg focus:ring-0 p-0 mt-1"
                />
              </div>
              <div className="relative bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <label className="text-xs font-bold text-[#e6614c] uppercase">Salvar como modelo</label>
                <input 
                  type="checkbox"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="w-6 h-6 rounded-full text-[#e6614c] focus:ring-[#e6614c]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center justify-between">
                Itens do Cronograma
                <span className="text-sm font-normal text-[#9CA3AF]">{items.length} itens</span>
              </h3>
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <SortableItem 
                        key={item.id} 
                        item={item} 
                        onEdit={() => { setEditingItem(item); setShowItemModal(true); }}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <button 
                onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                className="w-full border-2 border-dashed border-[#9CA3AF] rounded-2xl py-6 flex flex-col items-center justify-center text-[#9CA3AF] hover:bg-white hover:text-[#e6614c] hover:border-[#e6614c] transition-all gap-2"
              >
                <Plus size={24} />
                <span className="font-bold">Adicionar momento</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-[#4A3F35] leading-tight mb-2">{schedule?.title}</h1>
              <p className="text-[#e6614c] font-bold text-lg">
                {schedule?.date && format(new Date(schedule.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>

            <div className="relative pl-8 border-l-2 border-[#FAF6F0]">
              {items.map((item, index) => (
                <div key={item.id} className="relative mb-8 last:mb-0">
                  <div className="absolute -left-[41px] top-2 w-6 h-6 rounded-full bg-white border-4 border-[#FAF6F0] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#e6614c]" />
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-[#9CA3AF]">{item.time}</span>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[#e6614c]">
                          <LinkIcon size={16} />
                        </a>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-[#4A3F35] mb-2">{item.title}</h3>
                    {item.description && <p className="text-[#9CA3AF] text-sm leading-relaxed">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 flex gap-4 max-w-lg mx-auto w-full z-40">
        {isEditing ? (
          <>
            <button 
              onClick={() => { setIsEditing(false); releaseLock(); }}
              className="flex-1 py-4 font-bold text-[#4A3F35] hover:bg-gray-50 rounded-full transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] bg-[#e6614c] text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Save size={20} />
              Salvar
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleShare}
              className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-[#4A3F35] hover:bg-gray-100 transition-colors"
            >
              <Share2 size={24} />
            </button>
            <button 
              onClick={handleStartEdit}
              disabled={!!lock && lock.userId !== user?.uid}
              className="flex-1 bg-[#e6614c] text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit3 size={20} />
              Editar Cronograma
            </button>
          </>
        )}
      </footer>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowItemModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#4A3F35]">
                  {editingItem ? 'Editar Momento' : 'Adicionar Momento'}
                </h2>
                <button onClick={() => setShowItemModal(false)} className="p-2 text-[#9CA3AF]">
                  <X size={24} />
                </button>
              </div>
              
              <ItemForm 
                initialData={editingItem} 
                onSubmit={handleAddItem} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <HistoryDrawer 
            scheduleId={id} 
            onClose={() => setShowHistory(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableItem({ item, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm group"
    >
      <div 
        className="text-[#9CA3AF] cursor-grab active:cursor-grabbing p-1 touch-none"
        {...attributes} 
        {...listeners}
      >
        <GripVertical size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#9CA3AF]">{item.time}</span>
          <span className="text-xs text-[#9CA3AF]">({item.duration} min)</span>
        </div>
        <p className="font-bold text-[#4A3F35]">{item.title}</p>
      </div>
      <div className="flex gap-1">
        <button 
          onClick={onEdit}
          className="p-2 text-[#9CA3AF] hover:text-[#e6614c]"
        >
          <Edit3 size={18} />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-[#9CA3AF] hover:text-red-500"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function ItemForm({ initialData, onSubmit }: any) {
  const [time, setTime] = useState(initialData?.time || '09:00');
  const [duration, setDuration] = useState(initialData?.duration || 15);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [link, setLink] = useState(initialData?.link || '');

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="flex-1 bg-[#FAF6F0] rounded-2xl p-4">
          <label className="text-xs font-bold text-[#9CA3AF] uppercase">Horário</label>
          <input 
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-transparent border-none font-bold text-lg focus:ring-0 p-0"
          />
        </div>
        <div className="flex-1 bg-[#FAF6F0] rounded-2xl p-4">
          <label className="text-xs font-bold text-[#9CA3AF] uppercase">Duração (min)</label>
          <input 
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-transparent border-none font-bold text-lg focus:ring-0 p-0"
          />
        </div>
      </div>

      <div className="bg-[#FAF6F0] rounded-2xl p-4">
        <label className="text-xs font-bold text-[#9CA3AF] uppercase">Título</label>
        <input 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Louvor"
          className="w-full bg-transparent border-none font-bold text-lg focus:ring-0 p-0"
        />
      </div>

      <div className="bg-[#FAF6F0] rounded-2xl p-4">
        <label className="text-xs font-bold text-[#9CA3AF] uppercase">Descrição (Opcional)</label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notas ou detalhes..."
          className="w-full bg-transparent border-none font-medium focus:ring-0 p-0 h-24 resize-none"
        />
      </div>

      <div className="bg-[#FAF6F0] rounded-2xl p-4 flex items-center gap-3">
        <LinkIcon size={20} className="text-[#9CA3AF]" />
        <div className="flex-1">
          <label className="text-xs font-bold text-[#9CA3AF] uppercase">Link (Opcional)</label>
          <input 
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="w-full bg-transparent border-none font-medium focus:ring-0 p-0"
          />
        </div>
      </div>

      <button 
        onClick={() => onSubmit({ id: initialData?.id, time, duration, title, description, link })}
        className="w-full bg-[#e6614c] text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 mt-4"
      >
        <CheckCircle size={20} />
        Salvar Item
      </button>
    </div>
  );
}

function HistoryDrawer({ scheduleId, onClose }: any) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'history'), 
      orderBy('timestamp', 'desc'), 
      limit(20)
    );
    // Note: In production, we should filter by scheduleId. 
    // For simplicity here, we'll filter in memory or use a proper query if indexes allow.
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((h: any) => h.scheduleId === scheduleId);
      setHistory(docs);
    });
    return () => unsub();
  }, [scheduleId]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-lg bg-[#FAF6F0] rounded-t-[32px] h-[80vh] flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-[32px]">
          <h2 className="text-2xl font-bold text-[#4A3F35]">Histórico</h2>
          <button onClick={onClose} className="p-2 text-[#9CA3AF]">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-[#9CA3AF] mt-10">Nenhum histórico disponível.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#e6614c]/10 flex items-center justify-center text-[#e6614c] font-bold">
                  {item.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-bold">{item.userName}</span> {item.details}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    {item.timestamp?.toDate() && format(item.timestamp.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
