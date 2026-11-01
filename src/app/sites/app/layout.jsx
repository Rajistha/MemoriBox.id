import React from 'react';

export const metadata = {
  title: 'Admin - MemoriBox.id',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return <div className="min-h-screen bg-bg text-ink-900">{children}</div>;
}
