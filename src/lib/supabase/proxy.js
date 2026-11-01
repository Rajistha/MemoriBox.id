import { createServerClient } from '@supabase/ssr';

// Menyegarkan sesi Supabase di proxy dan mengembalikan pengguna terverifikasi (getUser, bukan getSession).
// `configured=false` berarti env Supabase belum diisi (mode lokal tanpa backend): gerbang login dilewati.
export async function updateSession(request, response) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url === 'https://mock.supabase.co') {
    return { response, user: null, configured: false };
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });

    const { data } = await supabase.auth.getUser();
    return { response, user: data?.user ?? null, configured: true };
  } catch {
    return { response, user: null, configured: true };
  }
}

export default updateSession;
