'use client';

import { supabase } from '@/lib/supabase';

/**
 * Pembaca papan antrean publik (layar TV). Hanya memakai RPC get_queue_state;
 * bila gagal mengembalikan null, tidak ada data karangan yang ditampilkan.
 * Bentuk hasil: { event: {id,name,date}, board: [...], completed_count, avg_service_seconds, ticket }.
 */
export async function fetchQueueState(slug, ticketId = null) {
  const token = slug;
  try {
    const { data, error } = await supabase.rpc('get_queue_state', {
      p_token: token,
      p_ticket_id: ticketId || null,
    });
    if (!error && data) return data;
  } catch {
    // jaringan putus: biarkan pemanggil mempertahankan tampilan terakhir
  }
  return null;
}
