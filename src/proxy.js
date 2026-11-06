import { NextResponse } from 'next/server';
import { isAliasHostname } from '@/lib/domains';
import { updateSession } from '@/lib/supabase/proxy';

const SUBDOMAINS = ['queue', 'live', 'link', 'app'];
const LOCAL_APP_PATHS = ['/sesi', '/queue', '/short'];

export async function proxy(request) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get('host') || '').split(':')[0];
  let path = url.pathname;

  // 1. Folder internal tidak boleh diakses langsung dari luar
  if (path === '/sites' || path.startsWith('/sites/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Admin hanya di app.memoribox.id: alamat lama spanel.* dialihkan ke app.* dengan jalur yang sama.
  if (host.startsWith('spanel.')) {
    const target = request.nextUrl.clone();
    target.host = host.replace(/^spanel\./, 'app.');
    target.port = '';
    return NextResponse.redirect(target, 308);
  }

  // 2. Tentukan ranah dari subdomain (memoribox.id atau *.localhost)
  let site = SUBDOMAINS.find((name) => host.startsWith(name + '.'));

  // 3. Mode localhost tanpa subdomain: alias path untuk memudahkan development
  // Alamat *.vercel.app tidak punya subdomain, jadi memakai alias jalur seperti localhost.
  const isLocal = isAliasHostname(host);
  if (!site && isLocal) {
    if (path === '/admin' || path.startsWith('/admin/') || path === '/spanel' || path.startsWith('/spanel/')) {
      site = 'app';
      path = path.replace(/^\/(admin|spanel)/, '') || '/';
    } else if (path === '/queue') {
      site = 'app';
      path = '/queue';
    } else if (path.startsWith('/queue/')) {
      site = 'queue';
      path = path.replace(/^\/queue/, '') || '/';
    } else if (path === '/antrian' || path.startsWith('/antrian/')) {
      site = 'queue';
      path = path.replace(/^\/antrian/, '') || '/';
    } else if (path.startsWith('/crew-sesi/')) {
      site = 'live';
      path = '/crew/' + path.replace(/^\/crew-sesi\//, '');
    } else if (path.startsWith('/crew/')) {
      site = 'live';
      path = path;
    } else if (path.startsWith('/live-sesi/')) {
      site = 'live';
      path = path.replace(/^\/live-sesi/, '') || '/';
    } else if (path.startsWith('/live/')) {
      site = 'live';
      path = path.replace(/^\/live/, '') || '/';
    } else if (LOCAL_APP_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
      site = 'app';
    } else if (path === '/bio' || path === '/links' || path === '/linktree') {
      site = 'link';
      path = '/';
    }
  }

  site = site || 'main';
  url.pathname = '/sites/' + site + (path === '/' ? '' : path);

  let response = NextResponse.rewrite(url);

  // 4. Sesi Supabase, gerbang login, dan header noindex untuk ranah admin
  if (site === 'app') {
    const session = await updateSession(request, response);
    response = session.response;
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');

    const redirectTo = (pathname, search = '') => {
      const target = request.nextUrl.clone();
      target.pathname = pathname;
      target.search = search;
      const res = NextResponse.redirect(target);
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    };
    const loginPath = isLocal ? '/admin/login' : '/login';

    // Produksi tanpa konfigurasi Supabase: tutup panel, jangan biarkan terbuka tanpa login.
    if (!session.configured && process.env.NODE_ENV === 'production') {
      return new NextResponse('Konfigurasi server belum lengkap.', {
        status: 503,
        headers: { 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }

    if (session.configured) {
      // Wajib login: tanpa sesi valid, halaman selain /login dialihkan ke login dengan tujuan asal (?next=).
      if (!session.user && path !== '/login') {
        const original = request.nextUrl.pathname + request.nextUrl.search;
        return redirectTo(loginPath, `?next=${encodeURIComponent(original)}`);
      }
      // Sudah login: halaman login tidak berguna, langsung ke beranda panel.
      if (session.user && path === '/login') {
        return redirectTo(isLocal ? '/admin' : '/');
      }
    }
  }
  return response;
}

// Next.js 16: berkas proxy.js (pengganti middleware.js) memakai ekspor `proxy`.
export default proxy;

export const config = {
  // Lewati api, aset Next, dan semua berkas statis (berekstensi)
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
