// Peta domain Memoribox. Domain induk dari NEXT_PUBLIC_ROOT_DOMAIN (bawaan memoribox.id).
//   memoribox.id        landing publik + shortlink
//   app.memoribox.id    seluruh admin (wajib login)
//   link.memoribox.id   halaman bio-link publik (menu Tautan)
//   live.memoribox.id   halaman sesi pelanggan (countdown & album) + input kru sesi
//   queue.memoribox.id  antrean pelanggan, layar TV, kios QR, terminal kru
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'memoribox.id';

// Host tanpa subdomain sungguhan (localhost dan alamat *.vercel.app) memakai alias jalur: /admin, /queue, /bio, dst.
export const isAliasHostname = (host) => ['localhost', '127.0.0.1'].includes(host) || /\.vercel\.app$/.test(host || '');

export const isLocalHost = () => typeof window !== 'undefined' && isAliasHostname(window.location.hostname);

export const siteUrl = (sub, path = '') => `https://${sub ? `${sub}.` : ''}${ROOT_DOMAIN}${path}`;
