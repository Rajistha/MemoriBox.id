const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="([^"]+)"/);
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const tables = ['financial_events', 'event_queues', 'transactions', 'settings', 'booked_dates', 'short_links'];
  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(t, 'count:', count, 'error:', error ? error.message : null);
  }
}
check();
