import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingWhatsApp from './FloatingWhatsApp';
import { SiteProfileProvider } from './SiteProfileContext';
import { getPackages, getSiteProfile } from '@/lib/publicData';

/** Kerangka halaman publik: navbar melayang, konten, footer, dan tombol mengambang. Profil bisnis berasal dari admin. */
export async function SiteShell({ children, showGallery = true }) {
  const [packages, profile] = await Promise.all([getPackages(), getSiteProfile()]);

  return (
    <SiteProfileProvider profile={profile}>
      <div className="min-h-screen bg-white text-ink-900 flex flex-col">
        <Navbar packages={packages} showGallery={showGallery} />
        <main className="flex-1">{children}</main>
        <Footer packages={packages} profile={profile} />
        <FloatingWhatsApp />
      </div>
    </SiteProfileProvider>
  );
}

export default SiteShell;
