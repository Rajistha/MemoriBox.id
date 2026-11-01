// Lokasi photobooth tetap ("Find Memoribox Offline"). Disimpan di tabel `settings`, key 'offline_locations'.
export const OFFLINE_KEY = 'offline_locations';

export const OFFLINE_STATUS = [
  { value: 'open', label: 'Buka sekarang' },
  { value: 'soon', label: 'Segera hadir' },
  { value: 'closed', label: 'Tutup sementara' },
];

export const statusLabel = (v) => OFFLINE_STATUS.find((s) => s.value === v)?.label || 'Buka sekarang';

export const mapsLink = (loc) =>
  loc.maps_url ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.partner || ''} ${loc.title || ''} ${loc.city || ''}`.trim())}`;

export const normalizeLocations = (value) => {
  const items = Array.isArray(value?.items) ? value.items : [];
  return items
    .filter((l) => l && l.title)
    .map((l) => ({
      id: l.id,
      title: l.title,
      partner: l.partner || '',
      city: l.city || '',
      image_url: l.image_url || '',
      maps_url: l.maps_url || '',
      status: l.status || 'open',
      active: l.active !== false,
    }));
};
