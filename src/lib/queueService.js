'use client';

import { supabase } from '@/lib/supabase';

/**
 * Queue Service managing Smart Queue interactions.
 * Connects to Supabase RPC with graceful local fallback state for offline/demo operation.
 */

// Local in-memory store for fallback/demo events (100% Anonim, tanpa nama & no WA)
let localQueues = [
  { id: '1', queue_number: 'A-01', seq_number: 1, customer_name: '', customer_phone: '', status: 'completed', called_count: 1 },
  { id: '2', queue_number: 'A-02', seq_number: 2, customer_name: '', customer_phone: '', status: 'completed', called_count: 1 },
  { id: '3', queue_number: 'A-03', seq_number: 3, customer_name: '', customer_phone: '', status: 'called', called_count: 2 },
  { id: '4', queue_number: 'A-04', seq_number: 4, customer_name: '', customer_phone: '', status: 'waiting', called_count: 0 },
  { id: '5', queue_number: 'A-05', seq_number: 5, customer_name: '', customer_phone: '', status: 'waiting', called_count: 0 },
];

export async function fetchQueueState(slug, ticketId = null) {
  const token = slug?.split('-').pop() || slug;
  try {
    if (supabase && supabase.rpc) {
      const { data, error } = await supabase.rpc('get_queue_state', {
        p_token: token,
        p_ticket_id: ticketId || null,
      });
      if (!error && data) {
        return data;
      }
    }
  } catch (err) {
    // console.warn('Supabase queue fetch error, fallback:', err);
  }

  // Dynamic event name from slug
  const cleanName = (slug || '')
    .replace(new RegExp(`-${token}$`), '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Acara Foto Memoribox';

  // Return formatted local fallback state
  return {
    event_name: cleanName,
    is_active: true,
    queues: localQueues.map((q) => ({
      id: q.id,
      queue_number: q.queue_number,
      seq_number: q.seq_number,
      customer_name: q.customer_name,
      initials: q.customer_name ? q.customer_name.slice(0, 2).toUpperCase() : `MB-${q.queue_number}`,
      status: q.status,
      called_count: q.called_count,
    })),
  };
}

export async function takeTicket(slug, customerName = '', customerPhone = '') {
  const token = slug?.split('-').pop() || slug;
  try {
    if (supabase && supabase.rpc) {
      const { data, error } = await supabase.rpc('take_queue_ticket', {
        p_token: token,
        p_name: customerName,
        p_phone: customerPhone || null,
      });
      if (!error && data) {
        return data;
      }
    }
  } catch (err) {
    // console.warn('Supabase take ticket error, fallback:', err);
  }

  // Local fallback ticket generation
  const nextSeq = localQueues.length + 1;
  const newTicket = {
    id: String(Date.now()),
    queue_number: `A-${String(nextSeq).padStart(2, '0')}`,
    seq_number: nextSeq,
    customer_name: customerName,
    customer_phone: customerPhone,
    status: 'waiting',
    called_count: 0,
  };
  localQueues.push(newTicket);
  return {
    ticket_id: newTicket.id,
    queue_number: newTicket.queue_number,
    seq_number: newTicket.seq_number,
  };
}

export async function confirmHeadingToBooth(ticketId) {
  try {
    if (supabase && supabase.rpc && ticketId) {
      await supabase.rpc('queue_confirm_heading', { p_ticket_id: ticketId });
      return true;
    }
  } catch (err) {
    // console.warn('queue_confirm_heading error:', err);
  }
  return true;
}

export async function leaveQueue(ticketId) {
  try {
    if (supabase && supabase.rpc && ticketId) {
      await supabase.rpc('queue_leave', { p_ticket_id: ticketId });
      return true;
    }
  } catch (err) {}
  return true;
}
