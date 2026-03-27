'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Eye, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface TemplateCardProps {
  template: any;
  onSelect: (template: any) => void;
  color?: string;
  icon?: React.ReactNode;
}

export function TemplateCard({ template, onSelect, color = "bg-[#829C8B]", icon }: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const hasId = !!template?.id;

  useEffect(() => {
    if (!hasId) return;
    // We'll use a full-screen overlay instead of a document listener for better portal support
  }, [hasId]);

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    
    let rafId: number;
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 144,
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
    if (!hasId) return;
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      try {
        await deleteDoc(doc(db, 'templates', template.id));
        toast.success('Modelo excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir modelo.');
      }
    }
    setMenuOpen(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasId) return;
    router.push(`/template/${template.id}?edit=true`);
    setMenuOpen(false);
  };

  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasId) return;
    router.push(`/template/${template.id}`);
    setMenuOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 144, // w-36 is 144px
      });
    }
    setMenuOpen(!menuOpen);
  };

  const handleCardClick = () => {
    if (!menuOpen) {
      onSelect(template);
    }
  };
  
  return (
    <div className="relative snap-start shrink-0">
      <button 
        onClick={handleCardClick}
        className={`w-[140px] h-[100px] ${color} rounded-2xl p-4 flex flex-col justify-between items-start text-white shadow-sm hover:opacity-90 transition-opacity text-left relative overflow-hidden group`}
      >
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
        {icon || <CalendarIcon size={24} />}
        <span className="font-semibold text-sm leading-tight line-clamp-2">{template?.title || 'Modelo'}</span>
      </button>

      {hasId && (
        <div className="absolute top-2 right-2">
          <button 
            ref={triggerRef}
            onClick={toggleMenu}
            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <MoreVertical size={18} />
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
                      className="w-36 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 overflow-hidden pointer-events-auto"
                    >
                      <button
                        onClick={handleView}
                        className="w-full px-3 py-2 text-left text-xs text-[#4A3F35] hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Eye size={14} className="text-[#9CA3AF]" />
                        Ver
                      </button>
                      <button
                        onClick={handleEdit}
                        className="w-full px-3 py-2 text-left text-xs text-[#4A3F35] hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Edit size={14} className="text-[#9CA3AF]" />
                        Editar
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} />
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
      )}
    </div>
  );
}
