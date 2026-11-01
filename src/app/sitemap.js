import { getPackages } from '@/lib/publicData';
import { siteUrl } from '@/lib/domains';

// Hanya alamat halaman nyata (tanpa fragmen "#"); paket mengikuti data dari admin.
export default async function sitemap() {
  const base = siteUrl('');
  const linkBase = siteUrl('link');
  const now = new Date();
  const packages = await getPackages();

  return [
    // Halaman utama
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/jadwal`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/galeri`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/kalkulator`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // Halaman detail paket (satu per paket, priority tinggi karena landing produk)
    ...packages.map((p) => ({
      url: `${base}/paket/${p.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    })),

    // Halaman bio-link (subdomain link.memoribox.id)
    { url: linkBase, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ];
}
