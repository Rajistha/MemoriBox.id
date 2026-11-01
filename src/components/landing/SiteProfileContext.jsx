'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useModal } from '@/components/ui/ModalProvider';
import { DEFAULT_PROFILE } from '@/lib/siteProfile';
import WhatsAppModal from './WhatsAppModal';

const Ctx = createContext(DEFAULT_PROFILE);

/** Menyediakan profil bisnis (dari admin) ke komponen klien di halaman publik. */
export function SiteProfileProvider({ profile, children }) {
  return <Ctx.Provider value={profile}>{children}</Ctx.Provider>;
}

export const useSiteProfile = () => useContext(Ctx);

/**
 * Membuka modal pratinjau pesan WhatsApp dengan nomor dari profil.
 * ModalProvider berada di luar SiteProfileProvider, jadi nomor diteruskan lewat props.
 */
export function useWhatsApp() {
  const profile = useSiteProfile();
  const { open } = useModal();
  const openWhatsApp = useCallback(
    (element) => open(React.cloneElement(element, { phone: profile.whatsapp })),
    [open, profile.whatsapp]
  );
  const askWhatsApp = useCallback(
    ({ title, message } = {}) => openWhatsApp(<WhatsAppModal title={title} defaultMessage={message} />),
    [openWhatsApp]
  );
  return useMemo(() => ({ openWhatsApp, askWhatsApp, profile }), [openWhatsApp, askWhatsApp, profile]);
}
