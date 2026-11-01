'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiMenu, FiExternalLink } from 'react-icons/fi';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/components/ui/ModalProvider';
import AdminSidebar, { NAV_SECTIONS } from '@/components/admin/AdminSidebar';
import AdminBottomBar from '@/components/admin/AdminBottomBar';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import { isLocalHost } from '@/lib/domains';

// Tab admin dimuat saat dibuka saja (code-splitting) agar panel awal ringan dan tidak lag.
const TabLoading = () => (
  <div className="space-y-4" aria-busy="true">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);
const load = (loader) => dynamic(loader, { loading: TabLoading });
const AdminDashboard = load(() => import('@/components/admin/AdminDashboard'));
const AdminSchedule = load(() => import('@/components/admin/AdminSchedule'));
const AdminGallery = load(() => import('@/components/admin/AdminGallery'));
const AdminReviews = load(() => import('@/components/admin/AdminReviews'));
const AdminLogos = load(() => import('@/components/admin/AdminLogos'));
const AdminPricelist = load(() => import('@/components/admin/AdminPricelist'));
const AdminLinks = load(() => import('@/components/admin/AdminLinks'));
const AdminUsage = load(() => import('@/components/admin/AdminUsage'));
const AdminFinance = load(() => import('@/components/admin/AdminFinance'));
const AdminQueue = load(() => import('@/components/admin/AdminQueue'));
const AdminSesi = load(() => import('@/components/admin/AdminSesi'));
const AdminShort = load(() => import('@/components/admin/AdminShort'));
const AdminOffline = load(() => import('@/components/admin/AdminOffline'));
const AdminProfil = load(() => import('@/components/admin/AdminProfil'));
const AdminInvoice = load(() => import('@/components/admin/AdminInvoice').then((m) => m.AdminInvoice));


// Tab panel tersinkron ke URL (mis. app.memoribox.id/queue). Di localhost jalur diawali /admin.
const TAB_SLUG = {
  dashboard: '',
  finance: 'kas',
  finance_events: 'events',
  finance_operational: 'operational',
  finance_recap: 'recap',
  finance_target: 'target',
  finance_invoice: 'invoice',
};
const SLUG_TAB = {
  kas: 'finance',
  events: 'finance_events',
  operational: 'finance_operational',
  recap: 'finance_recap',
  target: 'finance_target',
  invoice: 'finance_invoice',
  invoices: 'finance_invoice',
  documents: 'finance_invoice',
};
const KNOWN_TABS = ['schedule', 'gallery', 'reviews', 'logos', 'offline', 'profil', 'pricelist', 'links', 'short', 'queue', 'sesi', 'usage'];

const basePrefix = () => (isLocalHost() ? '/admin' : '');
const tabFromLocation = () => {
  const raw = window.location.pathname;
  const path = raw.startsWith('/admin') ? raw.slice('/admin'.length) : raw;
  const seg = path.split('/').filter(Boolean)[0];
  if (!seg) return 'dashboard';
  if (SLUG_TAB[seg]) return SLUG_TAB[seg];
  return KNOWN_TABS.includes(seg) ? seg : 'dashboard';
};
const urlForTab = (tab) => `${basePrefix()}/${TAB_SLUG[tab] ?? tab}`.replace(/\/$/, '') || '/';

export default function AdminPanel() {
  const [activeTab, setTab] = useState('dashboard');

  const setActiveTab = useCallback((tab) => {
    setTab(tab);
    window.history.pushState(null, '', urlForTab(tab) || '/');
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(tabFromLocation());
    const onPop = () => setTab(tabFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { confirm } = useModal();
  const router = useRouter();

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Keluar dari panel?',
      message: 'Sesi admin Memoribox akan diakhiri. Anda perlu login lagi untuk masuk kembali.',
      confirmText: 'Ya, Keluar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await supabase.auth.signOut();
      router.replace(isLocalHost() ? '/admin/login' : '/login');
    } catch {
      toast.error('Gagal logout');
    }
  };

  const getActiveTabLabel = () => {
    if (activeTab === 'dashboard') return 'Dashboard';
    if (
      activeTab === 'finance' ||
      activeTab === 'finance_events' ||
      activeTab === 'finance_operational' ||
      activeTab === 'finance_recap' ||
      activeTab === 'finance_target'
    ) {
      return 'Kas';
    }
    if (activeTab === 'finance_invoice') return 'Invoice';
    if (activeTab === 'schedule') return 'Jadwal';
    if (activeTab === 'queue') return 'Antrean';
    if (activeTab === 'sesi') return 'Sesi';
    if (activeTab === 'short') return 'Shortlink';
    if (activeTab === 'links') return 'Tautan';
    if (activeTab === 'gallery') return 'Galeri';
    if (activeTab === 'pricelist') return 'Pricelist';
    if (activeTab === 'logos') return 'Logo';
    if (activeTab === 'offline') return 'Lokasi Offline';
    if (activeTab === 'profil') return 'Profil';
    if (activeTab === 'reviews') return 'Ulasan';
    if (activeTab === 'usage') return 'Server';
    for (const section of NAV_SECTIONS) {
      const found = section.items.find((item) => item.id === activeTab);
      if (found) return found.label;
    }
    return 'Dashboard';
  };

  // Helper untuk menentukan initial subtab di AdminFinance
  const getFinanceSubTab = () => {
    if (activeTab === 'finance_operational') return 'operational';
    if (activeTab === 'finance_recap') return 'recap';
    if (activeTab === 'finance_target') return 'target';
    return 'events';
  };

  return (
    <div className="min-h-screen bg-bg text-ink-900 flex overflow-hidden">
      <title>{`${getActiveTabLabel()} - MemoriBox.id`}</title>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-ink-900)',
            border: '1px solid var(--color-line)',
            boxShadow: 'var(--shadow-card)',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: 'var(--radius-md)',
          },
        }}
      />

      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDrawerOpen={isSidebarOpen}
        onCloseDrawer={() => setIsSidebarOpen(false)}
        onLogoutClick={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0 bg-bg">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 bg-white border-b border-line px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4 z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-ink-700 bg-white hover:bg-bg p-2 rounded-xl border border-line shadow-xs transition"
              aria-label="Buka Menu"
            >
              <FiMenu size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-ink-900 font-heading truncate">
                {getActiveTabLabel()}
              </h1>
            </div>
          </div>

          {/* Right Header Status & Tools */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Website Link */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-ink-900 py-1.5 px-3 rounded-xl shadow-xs transition-colors"
            >
              <span>Lihat Website</span>
              <FiExternalLink size={12} />
            </a>

            {/* Admin Avatar Pill */}
            <div className="w-8 h-8 rounded-xl bg-yellow-400 text-ink-900 font-bold font-heading text-xs flex items-center justify-center border border-yellow-500 shadow-xs">
              MB
            </div>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto pb-12">
            {/* Dynamic Tab Body */}
            {activeTab === 'dashboard' && <AdminDashboard onSelectTab={setActiveTab} />}
            {activeTab === 'schedule' && <AdminSchedule />}
            {activeTab === 'gallery' && <AdminGallery />}
            {activeTab === 'reviews' && <AdminReviews />}
            {activeTab === 'logos' && <AdminLogos />}
            {activeTab === 'offline' && <AdminOffline />}
            {activeTab === 'profil' && <AdminProfil />}
            {activeTab === 'pricelist' && <AdminPricelist />}
            {activeTab === 'links' && <AdminLinks />}
            {activeTab === 'short' && <AdminShort />}
            {activeTab === 'queue' && <AdminQueue />}
            {activeTab === 'sesi' && <AdminSesi />}
            {activeTab === 'usage' && <AdminUsage />}
            {(activeTab === 'finance' ||
              activeTab === 'finance_events' ||
              activeTab === 'finance_operational' ||
              activeTab === 'finance_recap' ||
              activeTab === 'finance_target') && (
              <AdminFinance
                activeSubTab={getFinanceSubTab()}
                onSubTabChange={(sub) => setActiveTab(`finance_${sub}`)}
              />
            )}
            {(activeTab === 'finance_invoice' || activeTab === 'documents' || activeTab === 'invoice') && (
              <AdminInvoice />
            )}
          </div>
        </div>

        {/* Mobile Floating Bottom Bar */}
        <AdminBottomBar activeTab={activeTab} onSelectTab={setActiveTab} />
      </main>
    </div>
  );
}

