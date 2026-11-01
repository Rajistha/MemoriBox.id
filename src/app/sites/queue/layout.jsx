import React from 'react';

// Halaman antrean hanya untuk tamu via tautan acara; tidak perlu diindeks.
export const metadata = {
  title: 'Antrean Photobooth – MemoriBox.id',
  robots: {
    index: false,
    follow: false,
  },
};

export default function QueueLayout({ children }) {
  return <>{children}</>;
}

