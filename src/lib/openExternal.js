/**
 * Official wrapper for external URL navigation in Memoribox.
 * Used exclusively inside modal action buttons (e.g. WhatsApp, External Maps, Drive).
 * Direct window.open outside of modals is strictly forbidden.
 */
export function openExternal(url, target = '_blank') {
  if (typeof window === 'undefined' || !url) return null;
  // eslint-disable-next-line no-restricted-properties
  return window.open(url, target, 'noopener,noreferrer');
}

export default openExternal;
