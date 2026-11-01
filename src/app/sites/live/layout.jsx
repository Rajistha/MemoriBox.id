import React from 'react';

// Halaman sesi live hanya untuk pelanggan via tautan langsung; tidak perlu diindeks.
export const metadata = {
  title: 'Sesi Foto Live – MemoriBox.id',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LiveLayout({ children }) {
  return <>{children}</>;
}

