// Utilitas dokumen resmi (Quotation & Invoice) Memoribox.

export const STORAGE_KEY = 'memoribox_documents_history';

// Format YYYY-MM-DD berdasarkan zona waktu lokal (toISOString memakai UTC dan bisa mundur sehari di WIB).
const toLocalYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayString = () => toLocalYmd(new Date());

export const futureDateString = (days = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalYmd(d);
};

export const formatThousand = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(clean);
};

export const parseRawNumber = (val) => {
  if (val === '' || val === null || val === undefined) return 0;
  return parseInt(String(val).replace(/\D/g, ''), 10) || 0;
};

export const formatDateIndo = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Nomor berurutan per bulan: memakai urutan tertinggi + 1 (bukan jumlah dokumen) agar tidak bentrok setelah ada yang dihapus.
export const generateDocNumber = (type, existingDocs = []) => {
  const prefix = type === 'quotation' ? 'QUO' : 'INV';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const head = `${prefix}-${yearMonth}-`;
  let maxSeq = 0;
  for (const d of existingDocs) {
    if (d.number && d.number.startsWith(head)) {
      const seq = parseInt(d.number.slice(head.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${head}${String(maxSeq + 1).padStart(3, '0')}`;
};

// Rekening & syarat bawaan kosong; diisi dari menu Profil di admin.
export const DEFAULT_BANK_INFO = { bankName: '', accountNumber: '', accountHolder: '', qrisNote: '' };

export const DEFAULT_TNC_ITEMS = [
  'Booking jadwal dianggap sah dan mengikat setelah pembayaran Down Payment (DP) minimal 30%.',
  'Pelunasan sisa tagihan wajib diselesaikan maksimal H-1 sebelum waktu pelaksanaan acara.',
  'Konfirmasi perubahan jadwal/waktu maksimal H-7 sebelum acara (tergantung ketersediaan slot).',
  'Pembatalan sepihak oleh penyewa mengakibatkan uang muka (DP) dinyatakan hangus.',
  'Tim Memoribox standby di lokasi acara ±1 jam sebelum jadwal sewa dimulai untuk setup dan kalibrasi.',
  'Pihak penyelenggara/klien wajib menyediakan colokan listrik (min. 1000W) dan area min. 3x3 meter.',
];

export const DEFAULT_NOTES =
  'Terima kasih atas kepercayaan Anda memilih Memoribox Photobooth sebagai partner dokumentasi acara Anda. Abadikan setiap momen bersama kami!';

export const FONT_OPTIONS = [
  { id: 'inter', label: 'Inter (Modern Clean)', family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'arial', label: 'Arial (Standar Bersih)', family: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { id: 'calibri', label: 'Calibri (Office Formal)', family: 'Calibri, "Segoe UI", Candara, Optima, -apple-system, sans-serif' },
  { id: 'poppins', label: 'Poppins (Brand Geometric)', family: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'jakarta', label: 'Plus Jakarta Sans (Corporate)', family: 'var(--font-plus-jakarta), "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'times', label: 'Times New Roman (Serif Formal)', family: '"Times New Roman", Times, "Liberation Serif", Georgia, serif' },
];

export const getFont = (id) => FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0];

export const DEFAULT_ITEM = () => ({
  id: newItemId(),
  name: 'Paket Unlimited Print (3 Jam)',
  description:
    '• Cetak sepuasnya tanpa batas (Highspeed Print)\n• Unlimited Shots + Soft file via QR & GIF Booth\n• Custom Desain Frame 2R/4R (Free 2 Desain)\n• Aksesoris & Fun Props eksklusif\n• 2 Crew Standby + Lighting & Live Monitor 24"',
  qty: 1,
  unitPrice: 2900000,
  total: 2900000,
});

const LEGACY_FONT_MAP = {
  Inter: 'inter',
  Arial: 'arial',
  Calibri: 'calibri',
  Poppins: 'poppins',
  'Plus Jakarta Sans': 'jakarta',
  'Times New Roman': 'times',
};

const normalizeItem = (it, idx) => {
  const qty = Number(it.qty) || 1;
  const unitPrice = Number(it.unitPrice ?? it.price ?? it.rate ?? 0) || 0;
  return {
    id: it.id || `item-${idx}`,
    name: it.name || it.description || '',
    description: it.name ? it.description || it.details || '' : it.details || '',
    qty,
    unitPrice,
    total: Number(it.total ?? it.amount) || qty * unitPrice,
  };
};

// Baris tabel `documents` -> bentuk dokumen editor. Kolom `data` (JSON lengkap) diprioritaskan.
export const rowToDoc = (row) => {
  if (row?.data && typeof row.data === 'object' && row.data.number) {
    return { ...row.data, id: row.id };
  }
  const type = String(row.doc_type || 'invoice').toLowerCase() === 'quotation' ? 'quotation' : 'invoice';
  return {
    id: row.id,
    docType: type,
    docFont: LEGACY_FONT_MAP[row.doc_font] || row.doc_font || 'inter',
    number: row.doc_number,
    issueDate: row.issue_date || todayString(),
    dueDate: row.due_date || futureDateString(7),
    status: row.status || (type === 'quotation' ? 'sent' : 'unpaid'),
    client: { name: row.client_name || '', phone: row.client_phone || '', email: row.client_email || '', company: '' },
    event: { name: row.event_title || '', date: row.event_date || '', time: '', venue: row.venue || '' },
    items: Array.isArray(row.items) ? row.items.map(normalizeItem) : [],
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    downPayment: Number(row.down_payment) || 0,
    dpDate: '',
    taxRate: 0,
    taxAmount: 0,
    ref: '',
    balanceDue: Number(row.balance_due) || 0,
    bankInfo: DEFAULT_BANK_INFO,
    tncList: DEFAULT_TNC_ITEMS,
    notes: DEFAULT_NOTES,
    showStamp: true,
    stampShape: 'oval',
    updatedAt: row.updated_at,
  };
};

// Dokumen editor -> baris tabel `documents` (kolom relasional + salinan JSON lengkap di `data`).
export const docToRow = (doc) => ({
  id: doc.id,
  doc_type: doc.docType,
  doc_number: doc.number,
  status: doc.status,
  issue_date: doc.issueDate || todayString(),
  due_date: doc.dueDate || doc.issueDate || todayString(),
  client_name: doc.client.name,
  client_email: doc.client.email || '',
  client_phone: doc.client.phone || '',
  event_title: doc.event.name || '',
  event_date: doc.event.date || '',
  venue: doc.event.venue || '',
  items: doc.items,
  subtotal: doc.subtotal,
  discount: doc.discount,
  total_amount: doc.totalAmount,
  down_payment: doc.downPayment,
  balance_due: doc.balanceDue,
  doc_font: doc.docFont,
  data: doc,
  updated_at: doc.updatedAt,
});

export const STATUS_LABEL = {
  draft: 'Draft',
  sent: 'Terkirim',
  approved: 'Disetujui',
  declined: 'Ditolak',
  unpaid: 'Belum Dibayar',
  partial: 'DP Terbayar',
  paid: 'Lunas',
};

// ID baris item unik (dipanggil dari event handler, bukan saat render).
export const newItemId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const say = (n) => {
  n = Math.floor(n);
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${say(n - 10)} belas`;
  if (n < 100) return `${say(n / 10)} puluh${n % 10 ? ` ${say(n % 10)}` : ''}`;
  if (n < 200) return `seratus${n - 100 ? ` ${say(n - 100)}` : ''}`;
  if (n < 1000) return `${say(n / 100)} ratus${n % 100 ? ` ${say(n % 100)}` : ''}`;
  if (n < 2000) return `seribu${n - 1000 ? ` ${say(n - 1000)}` : ''}`;
  if (n < 1e6) return `${say(n / 1000)} ribu${n % 1000 ? ` ${say(n % 1000)}` : ''}`;
  if (n < 1e9) return `${say(n / 1e6)} juta${n % 1e6 ? ` ${say(n % 1e6)}` : ''}`;
  if (n < 1e12) return `${say(n / 1e9)} miliar${n % 1e9 ? ` ${say(n % 1e9)}` : ''}`;
  return `${say(n / 1e12)} triliun${n % 1e12 ? ` ${say(n % 1e12)}` : ''}`;
};

// Angka -> terbilang rupiah, mis. 2.900.000 -> "Dua juta sembilan ratus ribu rupiah".
export const terbilang = (value) => {
  const n = Math.round(Number(value) || 0);
  if (n <= 0) return 'Nol rupiah';
  const text = say(n);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} rupiah`;
};

export const TAX_OPTIONS = [
  { value: 0, label: 'Tanpa PPN' },
  { value: 11, label: 'PPN 11%' },
];
