'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Memunculkan elemen dengan transisi halus saat masuk layar.
 * - Konten tetap ada di HTML awal (aman untuk SEO dan tanpa JavaScript).
 * - Elemen yang sudah terlihat saat halaman dibuka tidak dianimasikan (tanpa kedip).
 * - Dilewati bila pengguna memilih mode kurangi gerakan.
 */
export function Reveal({ children, as: Tag = 'div', delay = 0, className = '' }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;

    setHidden(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHidden(false);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: hidden ? '0ms' : `${delay}ms` }}
      className={`transition-[opacity,translate] duration-700 ease-out ${hidden ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'} ${className}`}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
