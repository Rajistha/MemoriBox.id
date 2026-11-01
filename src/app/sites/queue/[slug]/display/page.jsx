'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Image from 'next/image';
import { FiVolume2, FiVolumeX, FiCheckCircle, FiClock, FiMaximize } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useModal } from '@/components/ui/ModalProvider';
import { usePolling } from '@/lib/usePolling';
import { unlockAudio, playChime, isAudioReady } from '@/lib/chime';
import { fetchQueueState } from '@/lib/queueService';

export default function TVDisplayPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const [queueState, setQueueState] = useState([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const prevCalledRef = useRef(null);
  const { open, closeTop } = useModal();

  // Load queue state
  const loadData = async () => {
    const res = await fetchQueueState(slug);
    const list = Array.isArray(res) ? res : res?.queues || [];
    setQueueState(list);

    const currentCalled = list?.find((q) => q.status === 'called');
    if (currentCalled) {
      // Check if new ticket is called or recall counter increased
      const prev = prevCalledRef.current;
      const isNewCall = !prev || prev.queue_number !== currentCalled.queue_number;
      const isRecall = prev && prev.queue_number === currentCalled.queue_number && prev.called_count !== currentCalled.called_count;

      if (isNewCall || isRecall) {
        playChime();
      }
      prevCalledRef.current = currentCalled;
    }
  };

  // Dedicated TV polling: runs continuously (pauseWhenHidden: false)
  usePolling(loadData, 3000, true, { pauseWhenHidden: false });

  // Initial prompt modal to unlock browser audio
  useEffect(() => {
    const checkAudio = () => {
      if (!isAudioReady()) {
        open(
          (closeModal) => (
            <div className="flex flex-col items-center text-center p-4 gap-4">
              <div className="w-16 h-16 rounded-3xl bg-yellow-100 text-yellow-800 flex items-center justify-center animate-bounce">
                <FiVolume2 className="text-3xl" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-2xl text-ink-900">
                  Aktifkan Suara Layar TV
                </h3>
                <p className="text-sm text-ink-700 mt-1 max-w-sm">
                  Browser memerlukan satu sentuhan untuk mengizinkan bel suara pemanggilan antrian berbunyi otomatis di panggung.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                pill
                className="px-8 font-extrabold mt-2 text-base"
                onClick={() => {
                  unlockAudio();
                  playChime();
                  setAudioUnlocked(true);
                  if (typeof closeModal === 'function') {
                    closeModal();
                  } else {
                    closeTop();
                  }
                }}
              >
                Aktifkan Suara Sekarang
              </Button>
            </div>
          ),
          { size: 'sm', nonDismissible: false }
        );
      } else {
        setAudioUnlocked(true);
      }
    };

    const timer = setTimeout(checkAudio, 600);
    return () => clearTimeout(timer);
  }, [open, closeTop]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentlyCalled = queueState.find((q) => q.status === 'called');
  const upcomingQueue = queueState
    .filter((q) => q.status === 'waiting')
    .slice(0, 6);

  return (
    <div className="h-screen w-screen overflow-hidden bg-bg text-ink-900 flex flex-col p-6 sm:p-8 select-none">
      <title>Layar Antrean - MemoriBox.id</title>
      {/* Top Banner */}
      <header className="flex items-center justify-between pb-6 border-b border-line">
        <div className="flex items-center gap-4">
          <div className="relative w-44 h-12">
            <Image src="/logo.png" alt="Memoribox" fill priority className="object-contain" />
          </div>
          <div className="hidden sm:block border-l-2 border-line pl-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-ink-500">
              Layar Antrian Panggung
            </span>
            <h2 className="font-heading font-bold text-lg text-ink-900">Event: {slug}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Indicator */}
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
              audioUnlocked
                ? 'bg-green-50 border-green-200 text-success'
                : 'bg-amber-50 border-amber-200 text-warning cursor-pointer'
            }`}
            onClick={() => {
              unlockAudio();
              playChime();
              setAudioUnlocked(true);
            }}
          >
            {audioUnlocked ? <FiVolume2 className="text-base" /> : <FiVolumeX className="text-base" />}
            <span>{audioUnlocked ? 'Audio Aktif' : 'Ketuk Aktifkan Audio'}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-line bg-surface text-ink-700 hover:bg-yellow-100 transition"
            aria-label="Layar Penuh"
          >
            <FiMaximize className="text-lg" />
          </button>
        </div>
      </header>

      {/* Main TV 16:9 Grid Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-6 overflow-hidden">
        {/* Left Col: Sedang Dipanggil (Spotlight 7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="h-full bg-surface rounded-3xl border-3 border-yellow-500 shadow-float p-8 sm:p-12 flex flex-col justify-between items-center text-center relative overflow-hidden">
            {/* Pulsing indicator pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500 text-ink-900 font-extrabold text-sm sm:text-base tracking-wide shadow-sm animate-pulse">
              <FiVolume2 className="text-lg" />
              <span>SEDANG DIPANGGIL</span>
            </div>

            {/* Giant Number Spotlight */}
            <div className="my-auto py-4">
              <span className="font-heading font-black text-[clamp(90px,16vw,180px)] leading-none text-ink-900 tracking-tight">
                {currentlyCalled ? currentlyCalled.queue_number : '—'}
              </span>
              <div className="mt-4">
                <span className="text-xl sm:text-2xl font-heading font-bold text-yellow-800">
                  {currentlyCalled ? `Tamu: ${currentlyCalled.initials || currentlyCalled.customer_name || currentlyCalled.queue_number}` : 'Menunggu Panggilan Berikutnya'}
                </span>
              </div>
            </div>

            {/* Sub note */}
            <div className="w-full bg-yellow-50 py-3 px-6 rounded-2xl border border-yellow-200 flex items-center justify-center gap-2 text-xs sm:text-sm text-ink-700 font-semibold">
              <FiCheckCircle className="text-success text-base shrink-0" />
              <span>Silakan menuju ke booth photobooth untuk memulai sesi foto Anda.</span>
            </div>
          </div>
        </div>

        {/* Right Col: Antrian Berikutnya (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-surface rounded-3xl border border-line shadow-card p-6 sm:p-7 justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <FiClock className="text-yellow-700 text-xl" />
              <h3 className="font-heading font-extrabold text-lg sm:text-xl text-ink-900">
                Antrian Berikutnya
              </h3>
            </div>
            <span className="text-xs font-bold text-ink-500 bg-bg px-2.5 py-1 rounded-full border border-line">
              {upcomingQueue.length} Menunggu
            </span>
          </div>

          {/* List of upcoming tickets */}
          <div className="flex-1 flex flex-col gap-2.5 my-4 overflow-y-auto pr-1">
            {upcomingQueue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-ink-500 py-12">
                <span className="text-sm">Belum ada antrian yang menunggu.</span>
              </div>
            ) : (
              upcomingQueue.map((item, idx) => (
                <div
                  key={item.queue_number}
                  className="bg-yellow-50/70 border border-line rounded-2xl p-4 flex items-center justify-between transition hover:bg-yellow-100"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-8 h-8 rounded-xl bg-ink-900 text-yellow-400 font-heading font-extrabold text-sm flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-heading font-black text-2xl text-ink-900">
                      {item.queue_number}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-yellow-800 bg-yellow-200/80 px-2.5 py-1 rounded-full">
                    {item.initials || item.customer_name || `Antrean ${item.queue_number}`}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-line text-center text-xs text-ink-500 font-medium">
            Scan QR di ponsel Anda untuk mendaftar tanpa antre berdiri.
          </div>
        </div>
      </main>
    </div>
  );
}
