'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { isLocalHost } from '@/lib/domains';
import { createClient } from '@/lib/supabase/client';

// Pesan galat Supabase Auth diterjemahkan agar jelas bagi pengguna dan tidak membocorkan detail teknis.
const loginErrorMessage = (err) => {
  const msg = String(err?.message || '').toLowerCase();
  if (err?.status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email atau kata sandi salah. Periksa kembali lalu coba lagi.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Periksa kotak masuk Anda untuk tautan konfirmasi.';
  }
  if (msg.includes('banned') || msg.includes('disabled')) {
    return 'Akun ini dinonaktifkan. Hubungi pemilik sistem.';
  }
  if (
    err?.name === 'AuthRetryableFetchError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.';
  }
  return 'Gagal masuk. Silakan coba lagi.';
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Tujuan setelah login: ?next= (hanya jalur internal), jika tidak ada ke beranda panel sesuai ranah.
  const destination = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('/login')) return next;
    return isLocalHost() ? '/admin' : '/';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) throw error;
      router.replace(destination());
      router.refresh();
    } catch (err) {
      console.warn('Login gagal:', err);
      setError(loginErrorMessage(err));
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

        <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800"
            >
              <FiAlertCircle className="mt-0.5 shrink-0 text-base" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            icon={FiMail}
            required
            placeholder="owner@memoribox.id"
            autoComplete="email"
            error={error ? ' ' : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
          />

          <Input
            label="Kata Sandi"
            type="password"
            revealable
            icon={FiLock}
            required
            placeholder="••••••••"
            autoComplete="current-password"
            error={error ? ' ' : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
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
