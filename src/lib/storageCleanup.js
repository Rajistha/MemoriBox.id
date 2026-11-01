import { createClient } from '@/lib/supabase/client';

/**
 * Storage Hygiene Subsystem for Supabase Storage.
 * Follows a strict two-stage process:
 * Stage 1: Scan and list unreferenced files.
 * Stage 2: Remove files ONLY after explicit user confirmation in modal.
 */

async function listAll(supabase, bucket, prefix = '') {
  const out = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data.filter((f) => f.id)); // ignore subfolders
    if (data.length < limit) break;
  }
  return out.map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
}

// Stage 1: Returns list of unreferenced file paths
export async function scanUnusedFiles(bucket, { prefix = '', inUse = [] } = {}) {
  const supabase = createClient();
  const used = new Set(inUse);
  const files = await listAll(supabase, bucket, prefix);
  return files.filter((path) => !used.has(path));
}

// Stage 2: Deletes files after confirmation
export async function removeFiles(bucket, paths) {
  if (!paths || !paths.length) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}

const storageCleanup = { scanUnusedFiles, removeFiles };
export default storageCleanup;
