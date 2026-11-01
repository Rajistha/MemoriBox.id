'use client';

import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

export default function Modal({ title, description, onClose, children, size = 'md', footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const width = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }[size] || 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-900/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${width} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white border border-line shadow-2xl outline-none z-10`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h3 className="font-heading font-extrabold text-base text-ink-900 leading-snug">{title}</h3>
            {description && <p className="text-xs text-ink-500 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-500 hover:text-ink-700 hover:bg-yellow-50 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
            aria-label="Tutup"
          >
            <FiX size={18} />
          </button>
        </div>
        {children && <div className="px-5 pb-5 overflow-y-auto">{children}</div>}
        {footer && (
          <div className="px-5 py-4 border-t border-line flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 bg-bg rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
