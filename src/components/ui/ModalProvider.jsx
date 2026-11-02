'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiHelpCircle } from 'react-icons/fi';

const ModalCtx = createContext(null);

const noop = () => Promise.resolve(undefined);
const FALLBACK = { confirm: () => Promise.resolve(false), notify: noop, prompt: () => Promise.resolve(null), open: noop, close: noop, closeTop: noop };

export const useModal = () => {
  const context = useContext(ModalCtx);
  if (!context) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[ModalProvider] useModal dipanggil di luar ModalProvider – kemungkinan HMR. Mengembalikan fallback no-op.');
    }
    return FALLBACK;
  }
  return context;
};

export function ModalProvider({ children }) {
  const [stack, setStack] = useState([]);
  const idRef = useRef(0);
  const stackRef = useRef([]);

  const push = useCallback((render, opts = {}) => {
    return new Promise((resolve) => {
      const id = ++idRef.current;
      setStack((s) => [...s, { id, render, opts, resolve, closing: false }].slice(-2));
    });
  }, []);

  // Menutup modal: promise langsung diselesaikan, lalu elemen dilepas setelah animasi keluar selesai.
  const close = useCallback((id, value, instant = false) => {
    let found = false;
    if (instant) {
      setStack((s) =>
        s.filter((m) => {
          if (m.id !== id) return true;
          found = true;
          if (typeof m.resolve === 'function') m.resolve(value);
          return false;
        })
      );
      return found;
    }
    setStack((s) =>
      s.map((m) => {
        if (m.id !== id || m.closing) return m;
        found = true;
        if (typeof m.resolve === 'function') m.resolve(value);
        return { ...m, closing: true };
      })
    );
    setTimeout(() => setStack((s) => s.filter((m) => m.id !== id)), 200);
    return found;
  }, []);

  const closeTop = useCallback(
    (value) => {
      const top = [...stackRef.current].reverse().find((m) => !m.closing);
      if (top) close(top.id, value);
    },
    [close]
  );

  // Standard modal methods
  const confirm = useCallback(
    (opts = {}) =>
      push((closeModal) => <ConfirmDialog {...opts} onClose={closeModal} />, {
        size: opts.size || 'sm',
        nonDismissible: opts.nonDismissible,
      }).then(Boolean),
    [push]
  );

  const notify = useCallback(
    (opts = {}) =>
      push((closeModal) => <NoticeDialog {...opts} onClose={closeModal} />, {
        size: opts.size || 'sm',
      }),
    [push]
  );

  const prompt = useCallback(
    (opts = {}) =>
      push((closeModal) => <PromptDialog {...opts} onClose={closeModal} />, {
        size: opts.size || 'sm',
      }),
    [push]
  );

  const open = useCallback(
    (nodeOrFn, opts = {}) => {
      if (typeof nodeOrFn === 'function') {
        return push(nodeOrFn, opts);
      }
      return push((closeModal) => (
        typeof nodeOrFn === 'object' && React.isValidElement(nodeOrFn)
          ? React.cloneElement(nodeOrFn, { onClose: closeModal })
          : nodeOrFn
      ), opts);
    },
    [push]
  );

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  // Lock scroll when modal is active
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (stack.length > 0) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [stack.length]);

  // Global ESC key listener for top-most modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const top = [...stack].reverse().find((m) => !m.closing);
        if (top && !top.opts?.nonDismissible) close(top.id, undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stack, close]);

  return (
    <ModalCtx.Provider value={{ confirm, notify, prompt, open, close, closeTop }}>
      {children}
      {stack.map((m, index) => (
          <ModalShell
            key={m.id}
            index={index}
            size={m.opts.size || 'md'}
            closing={m.closing}
            title={m.opts.title}
            hideCloseButton={m.opts.hideCloseButton}
            nonDismissible={m.opts.nonDismissible}
            onDismiss={(val, instant) => {
              if (!m.opts.nonDismissible) close(m.id, val, instant);
            }}
          >
            {m.render((val) => close(m.id, val))}
          </ModalShell>
      ))}
    </ModalCtx.Provider>
  );
}

function ModalShell({ children, size = 'md', index = 0, closing = false, onDismiss, nonDismissible }) {
  const containerRef = useRef(null);
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);

  // --- Swipe-to-dismiss (mobile bottom sheet) ---
  const dragState = useRef({ startY: 0, startX: 0, currentY: 0, dragging: false, startedOnHandle: false });
  const DISMISS_THRESHOLD = 80;
  const dismissRef = useRef(onDismiss);
  const nonDismissibleRef = useRef(nonDismissible);

  useEffect(() => {
    dismissRef.current = onDismiss;
    nonDismissibleRef.current = nonDismissible;
  }, [onDismiss, nonDismissible]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (!sheet) return;

    // Hanya aktif di layar mobile (< 768px / md breakpoint)
    const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

    // --- Touch Events (Mobile) ---
    const onTouchStart = (e) => {
      if (nonDismissibleRef.current || !isMobile()) return;

      const handle = sheet.querySelector('[data-drag-handle]');
      const startedOnHandle = handle && handle.contains(e.target);

      // Jangan cegah interaksi form control jika bukan drag handle
      if (!startedOnHandle && e.target.closest('input, textarea, select, button, a')) {
        return;
      }

      const contentEl = sheet.querySelector('[data-modal-content]');
      const scrolledToTop = !contentEl || contentEl.scrollTop <= 0;

      if (!startedOnHandle && !scrolledToTop) return;

      const touch = e.touches[0];
      dragState.current = {
        startY: touch.clientY,
        startX: touch.clientX,
        currentY: touch.clientY,
        dragging: false,
        startedOnHandle,
      };
    };

    const onTouchMove = (e) => {
      const ds = dragState.current;
      if (ds.startY === 0) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - ds.startY;
      const deltaX = touch.clientX - ds.startX;

      // Jika geser horizontal lebih dominan sebelum drag aktif, batalkan drag
      if (!ds.dragging && Math.abs(deltaX) > Math.abs(deltaY)) {
        ds.startY = 0;
        return;
      }

      // Jika di area konten & sedang scroll ke atas, biarkan scroll biasa
      if (!ds.startedOnHandle && deltaY < 0 && !ds.dragging) {
        return;
      }

      // Validasi scrollTop jika dimulai di konten
      if (!ds.startedOnHandle && !ds.dragging) {
        const contentEl = sheet.querySelector('[data-modal-content]');
        if (contentEl && contentEl.scrollTop > 0) {
          ds.startY = 0;
          return;
        }
      }

      // Mulai drag setelah pergeseran minimal 6px ke bawah
      if (!ds.dragging && deltaY > 6) {
        ds.dragging = true;
        sheet.style.animation = 'none';
        sheet.style.transition = 'none';
      }

      if (ds.dragging) {
        if (e.cancelable) e.preventDefault();
        ds.currentY = touch.clientY;

        // Gerakan 1:1 saat ditarik ke bawah; teredam bila ditarik ke atas
        const y = deltaY > 0 ? deltaY : deltaY * 0.2;
        sheet.style.setProperty('transform', `translateY(${y}px)`, 'important');

        if (backdrop) {
          const progress = Math.min(Math.max(0, deltaY / 320), 1);
          backdrop.style.opacity = `${1 - progress * 0.6}`;
        }
      }
    };

    const onTouchEnd = () => {
      const ds = dragState.current;
      if (!ds.dragging) {
        ds.startY = 0;
        return;
      }

      const deltaY = ds.currentY - ds.startY;

      if (deltaY > DISMISS_THRESHOLD && !nonDismissibleRef.current) {
        sheet.style.pointerEvents = 'none';
        sheet.style.transition = 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.setProperty('transform', 'translateY(100%)', 'important');
        if (backdrop) {
          backdrop.style.transition = 'opacity 0.2s ease';
          backdrop.style.opacity = '0';
        }
        setTimeout(() => {
          if (dismissRef.current) dismissRef.current(undefined, true);
        }, 200);
      } else {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
        sheet.style.setProperty('transform', 'translateY(0)', 'important');
        if (backdrop) {
          backdrop.style.transition = 'opacity 0.25s ease';
          backdrop.style.opacity = '1';
        }
      }

      dragState.current = { startY: 0, startX: 0, currentY: 0, dragging: false, startedOnHandle: false };
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd, { passive: true });
    sheet.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // --- Mouse Dragging pada Handle (untuk testing desktop/responsive mode) ---
    const handleEl = sheet.querySelector('[data-drag-handle]');
    let isMouseDown = false;
    let mouseStartY = 0;

    const onMouseMove = (e) => {
      if (!isMouseDown) return;
      const deltaY = e.clientY - mouseStartY;
      const y = deltaY > 0 ? deltaY : deltaY * 0.2;
      sheet.style.setProperty('transform', `translateY(${y}px)`, 'important');
      if (backdrop) {
        const progress = Math.min(Math.max(0, deltaY / 320), 1);
        backdrop.style.opacity = `${1 - progress * 0.6}`;
      }
    };

    const onMouseUp = (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const deltaY = e.clientY - mouseStartY;
      if (deltaY > DISMISS_THRESHOLD && !nonDismissibleRef.current) {
        sheet.style.pointerEvents = 'none';
        sheet.style.transition = 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.setProperty('transform', 'translateY(100%)', 'important');
        if (backdrop) {
          backdrop.style.transition = 'opacity 0.2s ease';
          backdrop.style.opacity = '0';
        }
        setTimeout(() => {
          if (dismissRef.current) dismissRef.current(undefined, true);
        }, 200);
      } else {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
        sheet.style.setProperty('transform', 'translateY(0)', 'important');
        if (backdrop) {
          backdrop.style.transition = 'opacity 0.25s ease';
          backdrop.style.opacity = '1';
        }
      }
    };

    const onMouseDown = (e) => {
      if (nonDismissibleRef.current || !isMobile() || e.button !== 0) return;
      isMouseDown = true;
      mouseStartY = e.clientY;
      sheet.style.animation = 'none';
      sheet.style.transition = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    if (handleEl) {
      handleEl.addEventListener('mousedown', onMouseDown);
    }

    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
      sheet.removeEventListener('touchcancel', onTouchEnd);
      if (handleEl) {
        handleEl.removeEventListener('mousedown', onMouseDown);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Focus trap
  useEffect(() => {
    if (!containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, []);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
    full: 'max-w-[96vw] h-[92vh]',
  }[size] || 'max-w-lg';

  // Backdrop offset z-index for stacked modals
  const zIndexBackdrop = 50 + index * 5;
  const zIndexContent = 51 + index * 5;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ zIndex: zIndexBackdrop }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={nonDismissible || closing ? undefined : onDismiss}
        className={`fixed inset-0 bg-[#1C1700]/50 backdrop-blur-[4px] ${closing ? 'anim-fade-out' : 'anim-fade-in'}`}
      />

      {/* Modal / Bottom Sheet Container */}
      <div
        ref={sheetRef}
        style={{ zIndex: zIndexContent }}
        className={`relative w-full ${sizeClasses} bg-white text-ink-900 shadow-float rounded-t-3xl md:rounded-3xl border border-line max-h-[90dvh] md:max-h-[90vh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,16px)] md:pb-0 ${closing ? 'anim-sheet-out' : 'anim-sheet-in'}`}
      >
        {/* Mobile Drag Handle — swipe down to close */}
        <div
          data-drag-handle
          className="md:hidden flex justify-center pt-3 pb-2.5 cursor-grab active:cursor-grabbing select-none touch-none"
          style={{ touchAction: 'none' }}
        >
          <div className="w-12 h-1.5 rounded-full bg-ink-300 pointer-events-none" />
        </div>

        {/* Content body */}
        <div data-modal-content className="overflow-y-auto flex-1 p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}

// Built-in Dialog: Confirm
function ConfirmDialog({
  title = 'Konfirmasi Tindakan',
  message,
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  tone = 'default', // 'danger' | 'warning' | 'default'
  onClose,
}) {
  const isDanger = tone === 'danger';
  const isWarning = tone === 'warning';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isDanger
              ? 'bg-red-50 text-danger'
              : isWarning
              ? 'bg-amber-50 text-warning'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {isDanger ? (
            <FiAlertTriangle className="text-xl" />
          ) : isWarning ? (
            <FiHelpCircle className="text-xl" />
          ) : (
            <FiInfo className="text-xl" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-bold text-lg text-ink-900">{title}</h3>
          {message && <p className="text-sm text-ink-700 mt-1 leading-relaxed">{message}</p>}
        </div>
        <button
          onClick={() => onClose(false)}
          className="text-ink-500 hover:text-ink-900 p-1.5 rounded-lg hover:bg-yellow-50 transition"
          aria-label="Tutup"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-2">
        <button
          type="button"
          onClick={() => onClose(false)}
          className="px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-700 hover:bg-yellow-50 active:scale-95 transition"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => onClose(true)}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition ${
            isDanger
              ? 'bg-danger text-white hover:bg-red-700'
              : 'bg-yellow-500 text-ink-900 hover:bg-yellow-600'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

// Built-in Dialog: Notice (Alert replacement)
function NoticeDialog({
  title = 'Informasi',
  message,
  tone = 'info', // 'success' | 'error' | 'info'
  okText = 'Mengerti',
  onClose,
}) {
  const isSuccess = tone === 'success';
  const isError = tone === 'error';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isSuccess
              ? 'bg-green-50 text-success'
              : isError
              ? 'bg-red-50 text-danger'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {isSuccess ? (
            <FiCheckCircle className="text-xl" />
          ) : isError ? (
            <FiAlertTriangle className="text-xl" />
          ) : (
            <FiInfo className="text-xl" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-bold text-lg text-ink-900">{title}</h3>
          {message && <p className="text-sm text-ink-700 mt-1 leading-relaxed">{message}</p>}
        </div>
        <button
          onClick={() => onClose(true)}
          className="text-ink-500 hover:text-ink-900 p-1.5 rounded-lg hover:bg-yellow-50 transition"
          aria-label="Tutup"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="flex justify-end pt-3 border-t border-line mt-2">
        <button
          type="button"
          onClick={() => onClose(true)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-yellow-500 text-ink-900 text-sm font-bold hover:bg-yellow-600 active:scale-95 transition"
        >
          {okText}
        </button>
      </div>
    </div>
  );
}

// Built-in Dialog: Prompt (Single input prompt replacement)
function PromptDialog({
  title = 'Masukkan Data',
  message,
  placeholder = '',
  defaultValue = '',
  confirmText = 'Simpan',
  cancelText = 'Batal',
  required = false,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (required && !value.trim()) {
      setError('Kolom ini wajib diisi');
      return;
    }
    onClose(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading font-bold text-lg text-ink-900">{title}</h3>
          {message && <p className="text-sm text-ink-700 mt-1 leading-relaxed">{message}</p>}
        </div>
        <button
          type="button"
          onClick={() => onClose(null)}
          className="text-ink-500 hover:text-ink-900 p-1.5 rounded-lg hover:bg-yellow-50 transition"
          aria-label="Tutup"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError('');
          }}
          placeholder={placeholder}
          autoFocus
          className="w-full h-11 px-3.5 rounded-xl border border-line bg-bg text-ink-900 text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
        />
        {error && <span className="text-xs text-danger font-medium">{error}</span>}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-2">
        <button
          type="button"
          onClick={() => onClose(null)}
          className="px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-700 hover:bg-yellow-50 active:scale-95 transition"
        >
          {cancelText}
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-yellow-500 text-ink-900 text-sm font-bold hover:bg-yellow-600 active:scale-95 transition"
        >
          {confirmText}
        </button>
      </div>
    </form>
  );
}

export default ModalProvider;
