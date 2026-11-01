'use client';

import React, { useState } from 'react';
import {
  FiHome,
  FiCalendar,
  FiClock,
  FiFileText,
  FiMoreHorizontal,
  FiX,
  FiDollarSign,
  FiTag,
  FiImage,
  FiStar,
  FiAward,
  FiHardDrive,
} from 'react-icons/fi';
import { ADMIN_MENU_ITEMS } from './AdminSidebar';

export function AdminBottomBar({ activeTab, onSelectTab }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'schedule', label: 'Jadwal', icon: FiCalendar },
    { id: 'finance_invoice', label: 'Invoice', icon: FiFileText },
    { id: 'finance', label: 'Kas', icon: FiDollarSign },
  ];

  const otherItems = ADMIN_MENU_ITEMS.filter(
    (item) => !mainTabs.some((m) => m.id === item.id)
  );

  return (
    <>
      {/* Bottom Bar Container */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-line shadow-md pb-[env(safe-area-inset-bottom,8px)]">
        <div className="h-16 flex items-center justify-around px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition ${
                  isActive ? 'text-ink-900 font-bold' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition ${
                    isActive
                      ? 'bg-yellow-400 text-ink-900 shadow-xs'
                      : 'text-ink-500 hover:bg-yellow-50'
                  }`}
                >
                  <Icon className="text-xl" />
                </div>
                <span className="text-xs tracking-tight">{tab.label}</span>
              </button>
            );
          })}

          {/* "Lainnya" trigger button */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition ${
              otherItems.some((o) => o.id === activeTab)
                ? 'text-ink-900 font-bold'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition ${
                otherItems.some((o) => o.id === activeTab)
                  ? 'bg-yellow-400 text-ink-900 shadow-xs'
                  : 'text-ink-500 hover:bg-yellow-50'
              }`}
            >
              <FiMoreHorizontal className="text-xl" />
            </div>
            <span className="text-xs tracking-tight">Lainnya</span>
          </button>
        </div>
      </div>

      {/* "Lainnya" Bottom Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-line shadow-2xl p-6 z-51 max-h-[75vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-heading font-bold text-base text-ink-900">Menu Lainnya</h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-lg border border-line bg-white hover:bg-bg text-ink-700"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {otherItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setSheetOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                      isActive
                        ? 'bg-yellow-400 text-ink-900 border-yellow-500 font-bold shadow-xs'
                        : 'bg-white border-line text-ink-700 font-medium hover:bg-bg shadow-2xs'
                    }`}
                  >
                    <Icon className="text-lg shrink-0" />
                    <span className="text-xs font-heading">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminBottomBar;
