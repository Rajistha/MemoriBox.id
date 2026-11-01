import React from 'react';
import LinkTreeView from '@/components/landing/LinkTreeView';
import { getLinktree } from '@/lib/publicData';

// Data tautan disegarkan tiap 60 detik; klik dicatat lewat RPC track_link_click.
export const revalidate = 60;

export async function generateMetadata() {
  const { profile } = await getLinktree();
  return {
    title: `${profile.name || 'MemoriBox'} – Bio Link`,
    description: profile.bio || 'Temukan semua tautan penting MemoriBox di satu tempat.',
    alternates: {
      canonical: 'https://link.memoribox.id',
    },
    openGraph: {
      title: `${profile.name || 'MemoriBox'} – Bio Link`,
      description: profile.bio || 'Temukan semua tautan penting MemoriBox di satu tempat.',
      url: 'https://link.memoribox.id',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${profile.name || 'MemoriBox'} – Bio Link`,
        },
      ],
    },
    twitter: {
      title: `${profile.name || 'MemoriBox'} – Bio Link`,
      description: profile.bio || 'Temukan semua tautan penting MemoriBox di satu tempat.',
      images: ['/og-image.png'],
    },
  };
}

export default async function BioLinkPage() {
  const { profile, links } = await getLinktree();
  return <LinkTreeView profile={profile} links={links} />;
}
