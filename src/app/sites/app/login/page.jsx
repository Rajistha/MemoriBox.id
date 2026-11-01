'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useModal } from '@/components/ui/ModalProvider';
import { isLocalHost } from '@/lib/domains';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { notify } = useModal();

  // Tujuan setelah login: ?next= (hanya jalur internal), jika tidak ada ke beranda panel sesuai ranah.
  const destination = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('/login')) return next;
    return isLocalHost() ? '/admin' : '/';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(destination());
      router.refresh();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Gagal Masuk',
        message: err?.message || 'Email atau kata sandi tidak cocok.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink-900 flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <title>Masuk - MemoriBox.id</title>
      <div className="max-w-md w-full bg-surface rounded-3xl p-8 sm:p-10 border-2 border-yellow-500 shadow-float flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="relative w-40 h-11 mb-2">
            <Image src="/logo.png" alt="Memoribox" fill priority className="object-contain" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-ink-900 mt-1">Masuk</h1>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            icon={FiMail}
            required
            placeholder="owner@memoribox.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Kata Sandi"
            type="password"
            icon={FiLock}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            pill
            loading={loading}
            icon={FiArrowRight}
            className="w-full mt-2 font-extrabold"
          >
            Masuk
          </Button>
        </form>

      </div>
    </div>
  );
}
