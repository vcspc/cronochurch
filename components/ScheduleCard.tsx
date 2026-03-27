'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ScheduleCardProps {
  schedule: any;
}

export function ScheduleCard({ schedule }: ScheduleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  
  const formattedDate = schedule.date 
    ? format(new Date(schedule.date), "EEE, dd MMM • HH:mm", { locale: ptBR }).toUpperCase()
    : "DATA NÃO DEFINIDA";

  useEffect(() => {
    // We'll use a full-screen overlay instead of a document listener for better portal support
  }, []);

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    
    let rafId: number;
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 192,
        });
      }
      rafId = requestAnimationFrame(updatePosition);
    };
    
    rafId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [menuOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este cronograma?')) {
      try {
        await deleteDoc(doc(db, 'schedules', schedule.id));
        toast.success('Cronograma excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir cronograma.');
      }
    }
    setMenuOpen(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/schedule/${schedule.id}?edit=true`);
    setMenuOpen(false);
  };

  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/schedule/${schedule.id}`);
    setMenuOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // w-48 is 192px
      });
    }
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className="relative group">
      <Link 
        href={`/schedule/${schedule.id}`}
        className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-50 hover:border-[#e6614c]/20 transition-colors"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <span className="text-[#e6614c] text-xs font-bold block mb-1">{formattedDate}</span>
            <h3 className="text-xl font-bold text-[#4A3F35] leading-tight group-hover:text-[#e6614c] transition-colors line-clamp-2">{schedule.title}</h3>
          </div>
          <div className="w-10" /> {/* Spacer for the menu button */}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-[#9CA3AF]">
              {schedule.createdBy?.substring(0, 1) || '?'}
            </div>
          </div>
          <span className="text-sm text-[#9CA3AF] flex items-center gap-1">
            <Clock size={16} />
            {schedule.items?.length || 0} itens
          </span>
        </div>
      </Link>

      <div className="absolute top-4 right-4">
        <button 
          ref={triggerRef}
          onClick={toggleMenu}
          className="text-[#9CA3AF] hover:text-[#4A3F35] p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical size={20} />
        </button>
        
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {menuOpen && (
              <>
                {/* Overlay to catch clicks outside the menu */}
                <div 
                  className="fixed inset-0 z-[9998] pointer-events-auto" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div 
                  className="fixed z-[9999] pointer-events-none" 
                  style={{ 
                    top: menuPosition.top, 
                    left: menuPosition.left 
                  }}
                >
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 overflow-hidden pointer-events-auto"
                  >
                    <button
                      onClick={handleView}
                      className="w-full px-4 py-2 text-left text-sm text-[#4A3F35] hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Eye size={16} className="text-[#9CA3AF]" />
                      Ver
                    </button>
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-sm text-[#4A3F35] hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Edit size={16} className="text-[#9CA3AF]" />
                      Editar
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </div>
  );
}
