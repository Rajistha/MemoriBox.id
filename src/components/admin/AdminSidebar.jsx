'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiPieChart,
  FiImage,
  FiTag,
  FiBriefcase,
  FiStar,
  FiCalendar,
  FiFileText,
  FiDollarSign,
  FiServer,
  FiUsers,
  FiLink,
  FiScissors,
  FiCamera,
  FiChevronDown,
  FiArrowLeft,
  FiLogOut,
  FiX,
  FiExternalLink,
  FiMapPin,
  FiUser,
} from 'react-icons/fi';

// Penamaan 1 kata tepat per section dan per item (sesuai instruksi: 'penamaan di sidebar pakai 1 kata aja')
export const NAV_SECTIONS = [
  {
    id: 'finance',
    title: 'Keuangan',
    items: [
      { id: 'schedule', label: 'Jadwal', icon: FiCalendar },
      { id: 'finance_invoice', label: 'Invoice', icon: FiFileText },
      { id: 'finance', label: 'Kas', icon: FiDollarSign },
    ],
  },
  {
    id: 'content',
    title: 'Konten',
    items: [
      { id: 'gallery', label: 'Galeri', icon: FiImage },
      { id: 'pricelist', label: 'Pricelist', icon: FiTag },
      { id: 'logos', label: 'Logo', icon: FiBriefcase },
      { id: 'reviews', label: 'Ulasan', icon: FiStar },
      { id: 'offline', label: 'Lokasi', icon: FiMapPin },
      { id: 'profil', label: 'Profil', icon: FiUser },
    ],
  },
  {
    id: 'apps',
    title: 'Aplikasi',
    items: [
      { id: 'queue', label: 'Antrean', icon: FiUsers },
      { id: 'sesi', label: 'Sesi', icon: FiCamera },
      { id: 'links', label: 'Tautan', icon: FiLink },
      { id: 'short', label: 'Shortlink', icon: FiScissors },
    ],
  },
  {
    id: 'system',
    title: 'Sistem',
    items: [
      { id: 'usage', label: 'Server', icon: FiServer },
    ],
  },
];

export const ADMIN_MENU_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  isDrawerOpen,
  onCloseDrawer,
  onLogoutClick,
}) {
  const [openSections, setOpenSections] = useState({
    finance: true,
    content: true,
    apps: true,
    system: true,
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const isTabActive = (item) => {
    if (item.id === 'finance') {
      return (
        activeTab === 'finance' ||
        activeTab === 'finance_events' ||
        activeTab === 'finance_operational' ||
        activeTab === 'finance_recap' ||
        activeTab === 'finance_target'
      );
    }
    return activeTab === item.id;
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between bg-white text-ink-900 border-r border-line select-none">
      {/* Top Header Logo - Elegan, Profesional & Rapi */}
      <div className="p-4 shrink-0 border-b border-line flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onSelectTab('dashboard');
            if (onCloseDrawer) onCloseDrawer();
          }}
          className="flex items-center gap-3 cursor-pointer text-left group"
          title="Dashboard"
        >
          <div className="relative w-32 h-9 shrink-0">
            <Image src="/logo.png" alt="Memoribox" fill sizes="128px" className="object-contain object-left" priority />
          </div>
        </button>

        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            className="lg:hidden text-ink-500 p-1.5 rounded-lg border border-line hover:bg-bg transition-colors"
            aria-label="Tutup Menu"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links Scrollable */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-bg">
        {/* Dashboard Standalone Button */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('dashboard');
            if (onCloseDrawer) onCloseDrawer();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'dashboard'
              ? 'bg-yellow-400 text-ink-900 font-bold shadow-xs'
              : 'text-ink-700 hover:bg-white hover:text-ink-900'
          }`}
        >
          <FiPieChart size={16} className={activeTab === 'dashboard' ? 'text-ink-900' : 'text-ink-500'} />
          <span>Dashboard</span>
        </button>

        {/* Section Accordions */}
        {NAV_SECTIONS.map((section) => {
          const isOpen = openSections[section.id] !== false;
          const hasActiveItem = section.items.some((item) => isTabActive(item));

          return (
            <div key={section.id} className="space-y-1 pt-1.5">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer rounded-lg ${
                  hasActiveItem ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <span>{section.title}</span>
                <FiChevronDown
                  size={12}
                  className={`transition-transform duration-200 text-ink-500 ${
                    isOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {/* Accordion Items */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  isOpen ? 'max-h-[500px] opacity-100 space-y-1' : 'max-h-0 opacity-0'
                }`}
              >
                {section.items.map((tab) => {
                  const Icon = tab.icon;

                  if (tab.isLink) {
                    return (
                      <Link
                        key={tab.id}
                        href={tab.to}
                        onClick={() => {
                          if (onCloseDrawer) onCloseDrawer();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-ink-700 hover:bg-white hover:text-ink-900 cursor-pointer font-medium border border-transparent hover:border-line/80 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon size={15} className="shrink-0 text-ink-500" />
                          <span className="truncate">{tab.label}</span>
                        </div>
                        <FiExternalLink size={12} className="text-ink-500 shrink-0" />
                      </Link>
                    );
                  }

                  const isActive = isTabActive(tab);

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(tab.id);
                        if (onCloseDrawer) onCloseDrawer();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold cursor-pointer transition-all ${
                        isActive
                          ? 'bg-yellow-400 text-ink-900 font-bold shadow-xs'
                          : 'text-ink-700 hover:bg-white hover:text-ink-900'
                      }`}
                    >
                      <Icon size={15} className={`shrink-0 ${isActive ? 'text-ink-900' : 'text-ink-500'}`} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Controls - Clean Professional */}
      <div className="p-3 shrink-0 border-t border-line space-y-2 bg-white">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-bg border border-line text-ink-700 px-2 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <FiArrowLeft size={13} />
            <span>Website</span>
          </Link>

          <button
            type="button"
            onClick={onLogoutClick}
            className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FiLogOut size={13} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-60 h-screen sticky top-0 shrink-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseDrawer}
          />
          {/* Drawer content */}
          <aside className="fixed inset-y-0 left-0 w-60 max-w-[80vw] h-full shadow-xl z-50">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
