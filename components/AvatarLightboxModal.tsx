'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ScrollLock from './ScrollLock';

interface AvatarLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  name: string;
  department?: string | null;
  rating?: number | null;
}

export default function AvatarLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  name,
  department,
  rating,
}: AvatarLightboxModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Capture phase so Esc closes only the lightbox, not a parent modal underneath
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const captionParts = [
    department ? department : null,
    typeof rating === 'number' ? `${rating} ELO` : null,
  ].filter(Boolean) as string[];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — profil şəkli`}
      onClick={(e) => {
        // Prevent bubbling to parent links/rows (React events bubble through portals)
        e.stopPropagation();
        onClose();
      }}
    >
      <ScrollLock />
      <div
        className="relative my-auto flex flex-col items-center gap-4 max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Bağla"
          className="absolute -top-3 -right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 shadow-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <img
          src={imageUrl}
          alt={name}
          className="max-w-[min(90vw,28rem)] max-h-[70vh] w-auto h-auto rounded-3xl object-contain border border-white/10 shadow-2xl bg-slate-900"
        />

        <div className="text-center space-y-0.5 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-base font-display font-black text-white">{name}</div>
          {captionParts.length > 0 && (
            <div className="text-xs font-mono text-slate-300">{captionParts.join(' • ')}</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
