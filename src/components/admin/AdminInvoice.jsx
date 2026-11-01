'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import toast from 'react-hot-toast';
import {
  FiFileText, FiPlus, FiTrash2, FiDownload, FiSave, FiEdit2, FiRefreshCw, FiDollarSign,
  FiSearch, FiSliders, FiX, FiLayers, FiColumns, FiMaximize2, FiUser, FiTag, FiZoomIn,
  FiZoomOut, FiCalendar, FiCreditCard, FiCheckCircle, FiFilePlus, FiCopy, FiEye, FiType,
  FiChevronDown, FiCloudOff,
} from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PACKAGES, mergePackages } from '@/lib/pricelistDefaults';
import { formatRupiah } from '@/lib/utils';
import { openExternal } from '@/lib/openExternal';
import { SITE_PROFILE_KEY, normalizeProfile } from '@/lib/siteProfile';
import {
  STORAGE_KEY, todayString, futureDateString, formatThousand, parseRawNumber, formatDateIndo,
  generateDocNumber, DEFAULT_BANK_INFO, DEFAULT_TNC_ITEMS, DEFAULT_NOTES, FONT_OPTIONS, getFont,
  DEFAULT_ITEM, newItemId, rowToDoc, docToRow, STATUS_LABEL, TAX_OPTIONS,
} from '@/lib/invoiceUtils';
import { useModal } from '@/components/ui/ModalProvider';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CustomListbox from '@/components/ui/CustomListbox';
import DateField from '@/components/ui/DateField';
import { Skeleton } from '@/components/ui/Skeleton';
import InvoiceSheet from '@/components/admin/InvoiceSheet';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const labelCls = 'block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5';
const fieldCls =
  'w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition';
const cardCls = 'bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-card space-y-4';

const QUO_STATUS = ['draft', 'sent', 'approved', 'declined'];
const INV_STATUS = ['unpaid', 'partial', 'paid'];

const emptyForm = (type = 'quotation', history = [], profile = null) => ({
  id: null,
  docType: type,
  docFont: 'inter',
  number: generateDocNumber(type, history),
  issueDate: todayString(),
  dueDate: futureDateString(7),
  status: type === 'quotation' ? 'sent' : 'unpaid',
  client: { name: '', phone: '', email: '', company: '' },
  event: { name: '', date: '', time: '', venue: '' },
  items: [DEFAULT_ITEM()],
  discount: '',
  downPayment: '',
  dpDate: '',
  taxRate: 0,
  ref: '',
  bankInfo: { ...DEFAULT_BANK_INFO, ...(profile?.bank || {}) },
  tncList: profile?.terms?.length ? profile.terms : DEFAULT_TNC_ITEMS,
  notes: DEFAULT_NOTES,
  showStamp: true,
  stampShape: 'oval',
});

// Dokumen tersimpan -> state form editor
const docToForm = (doc) => ({
  id: doc.id,
  docType: doc.docType || 'quotation',
  docFont: doc.docFont || 'inter',
  number: doc.number || '',
  issueDate: doc.issueDate || todayString(),
  dueDate: doc.dueDate || futureDateString(7),
  status: doc.status || 'sent',
  client: { name: '', phone: '', email: '', company: '', ...(doc.client || {}) },
  event: { name: '', date: '', time: '', venue: '', ...(doc.event || {}) },
  items: doc.items && doc.items.length > 0 ? doc.items : [DEFAULT_ITEM()],
  discount: doc.discount ? formatThousand(doc.discount) : '',
  downPayment: doc.downPayment ? formatThousand(doc.downPayment) : '',
  dpDate: doc.dpDate || '',
  taxRate: doc.taxRate || 0,
  ref: doc.ref || '',
  bankInfo: doc.bankInfo || DEFAULT_BANK_INFO,
  tncList: doc.tncList || DEFAULT_TNC_ITEMS,
  notes: doc.notes !== undefined ? doc.notes : DEFAULT_NOTES,
  showStamp: doc.showStamp !== false,
  stampShape: doc.stampShape || 'oval',
});

// State form -> dokumen berisi angka hasil hitung (dipakai lembar A4, simpan, dan WhatsApp)
const formToDoc = (form) => {
  const subtotal = form.items.reduce((acc, it) => acc + (it.total || 0), 0);
  const discount = parseRawNumber(form.discount);
  const downPayment = form.status === 'partial' && form.docType === 'invoice' ? parseRawNumber(form.downPayment) : 0;
  const taxRate = Number(form.taxRate) || 0;
  const taxAmount = Math.round((Math.max(0, subtotal - discount) * taxRate) / 100);
  const totalAmount = Math.max(0, subtotal - discount) + taxAmount;
  const balanceDue = form.status === 'paid' ? 0 : Math.max(0, totalAmount - downPayment);
  return {
    id: form.id,
    docType: form.docType,
    docFont: form.docFont,
    number: form.number,
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    status: form.status,
    client: form.client,
    event: form.event,
    items: form.items,
    subtotal,
    discount,
    totalAmount,
    downPayment,
    dpDate: form.dpDate,
    taxRate,
    taxAmount,
    ref: form.ref,
    balanceDue,
    bankInfo: form.bankInfo,
    tncList: form.tncList,
    notes: form.notes,
    showStamp: form.showStamp,
    stampShape: form.stampShape,
  };
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCache = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // penyimpanan penuh / diblokir: abaikan
  }
};

const buildWaMessage = (doc) => {
  const isQuo = doc.docType === 'quotation';
  const { client, event } = doc;
  let msg = `Halo Kak *${client.name || 'Klien'}*, salam hangat dari *Memoribox Photobooth*! ✨\n\n`;
  if (isQuo) {
    msg += `Berikut kami lampirkan *Surat Penawaran Resmi (Quotation)*:\n`;
    msg += `📄 *No. Dokumen:* ${doc.number}\n`;
    msg += `📅 *Tanggal Terbit:* ${formatDateIndo(doc.issueDate)}\n`;
    if (event.name) msg += `🎉 *Acara:* ${event.name} (${formatDateIndo(event.date)})\n`;
    msg += `\n*Rincian Paket & Layanan:*\n`;
    doc.items.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.name}* (Qty: ${it.qty}) - ${formatRupiah(it.total)}\n`;
    });
    if (doc.discount > 0) msg += `🎁 *Diskon:* -${formatRupiah(doc.discount)}\n`;
    if (doc.taxAmount > 0) msg += `PPN ${doc.taxRate}%: ${formatRupiah(doc.taxAmount)}
`;
    msg += `\n💰 *Total Investasi:* *${formatRupiah(doc.totalAmount)}*\n`;
    msg += `⏳ *Berlaku hingga:* ${formatDateIndo(doc.dueDate)}\n\n`;
    msg += `Silakan konfirmasi jika Kakak berkenan untuk mengunci slot jadwal acara. Terima kasih! 🙏`;
  } else {
    msg += `Berikut kami sampaikan *Faktur Tagihan Resmi (Invoice)*:\n`;
    msg += `📄 *No. Invoice:* ${doc.number}\n`;
    if (event.name) msg += `🎉 *Acara:* ${event.name} (${formatDateIndo(event.date)})\n`;
    if (doc.taxAmount > 0) msg += `PPN ${doc.taxRate}%: ${formatRupiah(doc.taxAmount)}
`;
    msg += `💰 *Total Biaya:* ${formatRupiah(doc.totalAmount)}\n`;
    if (doc.downPayment > 0) {
      msg += `✅ *DP Terbayar:* ${formatRupiah(doc.downPayment)}\n`;
      msg += `⏳ *Sisa Pelunasan:* *${formatRupiah(doc.balanceDue)}*\n`;
    } else if (doc.status === 'paid') {
      msg += `✅ *Status:* LUNAS\n`;
    } else {
      msg += `⏳ *Status:* Menunggu Pembayaran DP / Lunas\n`;
    }
    msg += `\n*Pembayaran dapat ditransfer ke:*\n`;
    msg += `🏦 *${doc.bankInfo.bankName}*\n`;
    msg += `💳 *${doc.bankInfo.accountNumber}*\n`;
    msg += `👤 a/n *${doc.bankInfo.accountHolder}*\n\n`;
    msg += `Mohon kirimkan bukti transfer setelah pembayaran dilakukan ya Kak. Terima kasih banyak! ✨`;
  }
  return msg;
};

// Render A4 -> PDF multi-halaman tanpa dialog cetak. Library dimuat lazy.
async function exportSheetToPdf(filename) {
  const node = document.getElementById('printable-document');
  if (!node) throw new Error('Lembar dokumen tidak ditemukan');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: A4_WIDTH,
    onclone: (clonedDoc) => {
      const el = clonedDoc.getElementById('printable-document');
      if (el) {
        el.style.transform = 'none';
        el.style.boxShadow = 'none';
        el.style.border = 'none';
      }
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const slicePx = Math.round((canvas.width * pageH) / pageW);
  const pages = Math.max(1, Math.ceil((canvas.height - 4) / slicePx));

  for (let p = 0; p < pages; p++) {
    const sy = p * slicePx;
    const sh = Math.min(slicePx, canvas.height - sy);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sh;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
    if (p > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, pageW, (sh * pageW) / canvas.width, undefined, 'FAST');
  }

  pdf.save(filename);
}

function SegButton({ active, onClick, icon: Icon, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
        active ? 'bg-yellow-500 text-ink-900 shadow-sm' : 'text-ink-700 hover:bg-yellow-50'
      }`}
    >
      {Icon && <Icon size={13} />}
      {children}
      {badge !== undefined && (
        <span
          className={`px-1.5 rounded-full text-xs tabular-nums ${
            active ? 'bg-ink-900/10 text-ink-900' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function CardHeading({ icon: Icon, tone = 'bg-yellow-100 text-yellow-800', children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-3 border-b border-line">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2 min-w-0">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
          <Icon size={14} />
        </span>
        <span className="truncate">{children}</span>
      </span>
      {right}
    </div>
  );
}

function WhatsAppShareModal({ doc, onClose }) {
  const text = useMemo(() => buildWaMessage(doc), [doc]);
  const hasPhone = Boolean(doc.client.phone);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <SiWhatsapp className="text-success text-xl" />
          <h3 className="font-heading font-bold text-lg text-ink-900">Bagikan ke WhatsApp</h3>
        </div>
        <button
          type="button"
          onClick={() => onClose()}
          className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-yellow-50"
          aria-label="Tutup"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-ink-700">Pratinjau pesan untuk {doc.client.name || 'klien'}:</label>
        <textarea
          rows={10}
          readOnly
          value={text}
          className="w-full p-3 rounded-xl border border-line bg-yellow-50/50 text-ink-900 text-xs leading-relaxed resize-none focus:outline-none"
        />
        {!hasPhone && (
          <p className="text-xs text-danger font-medium">Nomor WhatsApp klien belum diisi pada formulir.</p>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-line">
        <Button
          variant="secondary"
          size="sm"
          icon={FiCopy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast.success('Tersalin');
            } catch {
              toast.error('Gagal menyalin teks');
            }
          }}
        >
          Salin Teks
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={SiWhatsapp}
          disabled={!hasPhone}
          onClick={() => {
            const phone = doc.client.phone.replace(/\D/g, '').replace(/^0/, '62');
            openExternal(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
            onClose();
          }}
        >
          Buka WhatsApp
        </Button>
      </div>
    </div>
  );
}

export function AdminInvoice() {
  const { confirm, open } = useModal();

  const [viewMode, setViewMode] = useState('split'); // 'split' | 'editor' | 'preview' | 'history'
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [openPkg, setOpenPkg] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isBankEditing, setIsBankEditing] = useState(false);

  const [form, setForm] = useState(() => emptyForm('quotation', []));
  const [profile, setProfile] = useState(null);
  const baselineRef = useRef('');
  const historyRef = useRef([]);

  const [zoomMode, setZoomMode] = useState('fit');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);
  const [docHeight, setDocHeight] = useState(A4_HEIGHT);
  const sheetRef = useRef(null);
  const previewContainerRef = useRef(null);

  const doc = useMemo(() => formToDoc(form), [form]);
  // Lembar A4 mengikuti ketikan dengan prioritas rendah agar input tetap responsif.
  const sheetDoc = useDeferredValue(doc);
  const font = getFont(form.docFont);

  const setField = useCallback((patch) => setForm((prev) => ({ ...prev, ...patch })), []);
  const setClient = (patch) => setForm((prev) => ({ ...prev, client: { ...prev.client, ...patch } }));
  const setEvent = (patch) => setForm((prev) => ({ ...prev, event: { ...prev.event, ...patch } }));

  const snapshot = useCallback((d) => JSON.stringify({ ...d, updatedAt: undefined }), []);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Baseline awal setelah nomor dokumen siap
  useEffect(() => {
    if (!baselineRef.current) baselineRef.current = snapshot(formToDoc(emptyForm('quotation', [])));
  }, [snapshot]);

  // Ukuran kontainer & tinggi lembar untuk auto-fit
  const hasPreview = viewMode === 'split' || viewMode === 'preview';
  useEffect(() => {
    if (!hasPreview) return undefined;
    const container = previewContainerRef.current;
    if (!container) return undefined;
    const update = () => {
      const w = container.clientWidth;
      const h = sheetRef.current?.offsetHeight || A4_HEIGHT;
      setContainerWidth((prev) => (prev === w ? prev : w));
      setDocHeight((prev) => (prev === h ? prev : h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, [hasPreview, viewMode]);

  const activeScale = useMemo(() => {
    if (zoomMode === 'custom') return zoomLevel;
    const available = Math.max(240, containerWidth - 24);
    return Math.min(1.05, Math.max(0.3, Number((available / A4_WIDTH).toFixed(3))));
  }, [zoomMode, zoomLevel, containerWidth]);

  // Profil bisnis (rekening, syarat, identitas) dari menu Profil; dipakai sebagai isi awal dokumen baru.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', SITE_PROFILE_KEY).maybeSingle();
        if (ignore) return;
        const p = normalizeProfile(data?.value);
        setProfile(p);
        setForm((prev) => {
          if (prev.id || prev.bankInfo.accountNumber) return prev;
          const next = {
            ...prev,
            bankInfo: { ...DEFAULT_BANK_INFO, ...p.bank },
            tncList: p.terms.length ? p.terms : prev.tncList,
          };
          baselineRef.current = '';
          return next;
        });
      } catch {
        // tanpa profil: dokumen memakai isi bawaan kosong
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Daftar paket dari pricelist admin
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'pricelist').maybeSingle();
        if (!ignore && data?.value?.packages) setPackages(mergePackages(data.value.packages));
      } catch {
        // pakai paket bawaan
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Riwayat dokumen: Supabase (utama) + cadangan localStorage
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setLoadError(false);
    const cached = readCache();
    let list = cached;
    try {
      const { data, error } = await supabase.from('documents').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      const cloud = (data || []).map(rowToDoc);
      const pendingLocal = cached.filter((d) => d.localOnly && !cloud.some((c) => c.id === d.id));
      list = [...pendingLocal, ...cloud];
      writeCache(list);
    } catch (err) {
      console.warn('Gagal memuat dokumen dari cloud:', err);
      setLoadError(true);
    } finally {
      setHistory(list);
      setLoadingHistory(false);
    }
    return list;
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const list = await loadHistory();
      if (ignore) return;
      // nomor dokumen awal mengikuti riwayat
      setForm((prev) => {
        if (prev.id) return prev;
        const next = { ...prev, number: generateDocNumber(prev.docType, list) };
        baselineRef.current = snapshot(formToDoc(next));
        return next;
      });
    })();
    return () => {
      ignore = true;
    };
  }, [loadHistory, snapshot]);

  const isDirty = () => snapshot(doc) !== baselineRef.current;

  const confirmDiscard = async () => {
    if (!isDirty()) return true;
    return confirm({
      title: 'Buang perubahan?',
      message: 'Dokumen yang sedang diedit belum disimpan. Perubahan akan hilang jika Anda melanjutkan.',
      confirmText: 'Buang Perubahan',
      tone: 'danger',
    });
  };

  const items = form.items;

  const addItem = (custom = null) => {
    setField({
      items: [...items, custom || { id: newItemId(), name: '', description: '', qty: 1, unitPrice: 0, total: 0 }],
    });
  };

  const updateItem = (index, patch) => {
    setForm((prev) => {
      const copy = [...prev.items];
      const target = { ...copy[index], ...patch };
      target.total = (target.qty || 1) * (target.unitPrice || 0);
      copy[index] = target;
      return { ...prev, items: copy };
    });
  };

  const removeItem = (index) => {
    if (items.length <= 1) {
      toast.error('Minimal harus ada 1 item di dalam dokumen');
      return;
    }
    setField({ items: items.filter((_, i) => i !== index) });
  };

  const applyPreset = (pkg, priceObj) => {
    const featureText = (pkg.features || []).map((f) => `• ${f}`).join('\n');
    const noteText = pkg.extraNote ? `\n• Catatan: ${pkg.extraNote}` : '';
    setField({
      items: [
        {
          id: newItemId(),
          name: `Paket ${pkg.label} (${priceObj.label}${priceObj.sub ? ` - ${priceObj.sub}` : ''})`,
          description: `${featureText}${noteText}`,
          qty: 1,
          unitPrice: priceObj.price,
          total: priceObj.price,
        },
      ],
    });
    setOpenPkg(null);
    toast.success(`Paket ${pkg.label} berhasil dimasukkan`);
  };

  // Konversi membuat dokumen BARU (dokumen asal tidak ditimpa) dan menyimpan nomor asal sebagai referensi.
  const convertType = async (target) => {
    if (form.docType === target) return;
    if (form.id && isDirty() && !(await confirmDiscard())) return;
    const fromSaved = Boolean(form.id);
    setForm((prev) => ({
      ...prev,
      id: null,
      docType: target,
      status: target === 'invoice' ? 'unpaid' : 'sent',
      number: generateDocNumber(target, history),
      ref: prev.id ? prev.number : prev.ref,
      issueDate: prev.id ? todayString() : prev.issueDate,
    }));
    baselineRef.current = '';
    const label = target === 'invoice' ? 'Invoice' : 'Quotation';
    toast.success(fromSaved ? `${label} baru dibuat dari ${form.number} (belum disimpan)` : `Beralih ke format ${label}`);
  };

  const handleDuplicate = async (d) => {
    if (!(await confirmDiscard())) return;
    setForm({
      ...docToForm(d),
      id: null,
      number: generateDocNumber(d.docType, history),
      issueDate: todayString(),
      dueDate: futureDateString(7),
      status: d.docType === 'quotation' ? 'draft' : 'unpaid',
      downPayment: '',
      dpDate: '',
      ref: '',
    });
    baselineRef.current = '';
    setViewMode('split');
    toast.success(`Dokumen disalin dari ${d.number} (belum disimpan)`);
  };

  const handleNewDocument = async () => {
    if (!(await confirmDiscard())) return;
    const next = emptyForm(form.docType, history, profile);
    setForm(next);
    baselineRef.current = snapshot(formToDoc(next));
    setViewMode((v) => (v === 'history' ? 'split' : v));
    toast.success('Formulir dokumen baru disiapkan');
  };

  const handleSave = async () => {
    if (!form.client.name.trim()) return toast.error('Nama klien wajib diisi');
    if (!form.number.trim()) return toast.error('Nomor dokumen wajib diisi');
    if (form.items.some((it) => !it.name.trim() || it.total <= 0)) {
      return toast.error('Pastikan semua baris item memiliki nama dan harga');
    }
    const duplicate = history.find((d) => d.number === form.number.trim() && d.id !== form.id);
    if (duplicate) return toast.error(`Nomor ${form.number} sudah dipakai dokumen lain`);

    setSaving(true);
    const id = form.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = { ...doc, id, number: form.number.trim(), updatedAt: new Date().toISOString() };

    let synced = true;
    try {
      const { error } = await supabase.from('documents').upsert(docToRow(payload), { onConflict: 'id' });
      if (error) throw error;
    } catch (err) {
      console.error('Gagal menyimpan dokumen:', err);
      synced = false;
    }

    const stored = synced ? payload : { ...payload, localOnly: true };
    const exists = historyRef.current.some((d) => d.id === id);
    const updated = exists
      ? historyRef.current.map((d) => (d.id === id ? stored : d))
      : [stored, ...historyRef.current];
    setHistory(updated);
    writeCache(updated);
    setForm((prev) => ({ ...prev, id }));
    baselineRef.current = snapshot({ ...doc, id, number: payload.number });
    setSaving(false);

    if (synced) toast.success(`${form.docType === 'quotation' ? 'Quotation' : 'Invoice'} berhasil disimpan`);
    else toast.error('Gagal menyimpan ke cloud, data tersimpan di browser');
  };

  const handleLoad = async (d, nextView = 'split') => {
    if (d.id !== form.id && !(await confirmDiscard())) return;
    const next = docToForm(d);
    setForm(next);
    baselineRef.current = snapshot(formToDoc(next));
    setViewMode(nextView);
    toast.success(`Dokumen ${d.number} dimuat`);
  };

  const handleDelete = async (d) => {
    const ok = await confirm({
      title: 'Hapus dokumen?',
      message: `${d.number} atas nama ${d.client?.name || '-'} akan dihapus dari riwayat dan tidak bisa dikembalikan.`,
      confirmText: 'Ya, Hapus',
      tone: 'danger',
    });
    if (!ok) return;

    const updated = historyRef.current.filter((x) => x.id !== d.id);
    setHistory(updated);
    writeCache(updated);
    if (form.id === d.id) {
      const next = emptyForm(form.docType, updated, profile);
      setForm(next);
      baselineRef.current = snapshot(formToDoc(next));
    }
    try {
      const { error } = await supabase.from('documents').delete().eq('id', d.id);
      if (error) throw error;
      toast.success('Dokumen dihapus');
    } catch {
      toast.error('Gagal menghapus di cloud');
    }
  };

  const handleDownloadPdf = async () => {
    if (viewMode === 'editor') {
      toast.error('Buka Split View atau Pratinjau A4 untuk mengunduh PDF');
      return;
    }
    setDownloading(true);
    const toastId = toast.loading('Sedang menyiapkan file PDF...');
    try {
      const filename = `${form.docType === 'quotation' ? 'Quotation' : 'Invoice'}-${form.number || 'Memoribox'}.pdf`;
      await exportSheetToPdf(filename);
      toast.success(`PDF berhasil diunduh: ${filename}`, { id: toastId });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error(`Gagal unduh PDF: ${err?.message || 'Error'}`, { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWa = () => {
    open((close) => <WhatsAppShareModal doc={doc} onClose={close} />, { size: 'md' });
  };

  const filteredHistory = useMemo(() => {
    const q = searchHistory.trim().toLowerCase();
    return history.filter((d) => {
      if (filterType !== 'all' && d.docType !== filterType) return false;
      if (!q) return true;
      return (
        d.number?.toLowerCase().includes(q) ||
        d.client?.name?.toLowerCase().includes(q) ||
        d.event?.name?.toLowerCase().includes(q)
      );
    });
  }, [history, filterType, searchHistory]);

  const historyStats = useMemo(() => {
    const invoices = history.filter((d) => d.docType === 'invoice');
    const paid = invoices.filter((d) => d.status === 'paid');
    return {
      total: history.length,
      quo: history.length - invoices.length,
      inv: invoices.length,
      paidCount: paid.length,
      paidVal: paid.reduce((acc, d) => acc + (d.totalAmount || 0), 0),
    };
  }, [history]);

  const isQuo = form.docType === 'quotation';
  const statusOptions = (isQuo ? QUO_STATUS : INV_STATUS).map((s) => ({
    value: s,
    label: s === 'partial' ? 'Uang Muka / DP Terbayar' : STATUS_LABEL[s],
  }));
  const fontOptions = FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label, style: { fontFamily: f.family } }));

  return (
    <div className="space-y-6">
      {/* ── BAR KONTROL ── */}
      <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-card space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0 xl:flex-1">
            <h3 className="text-xl sm:text-2xl font-bold text-ink-900 font-heading tracking-tight">
              Quotation &amp; Invoice
            </h3>
            <p className="text-sm text-ink-500 mt-0.5 tabular-nums">{form.number}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-full p-1 -m-1 [&>*]:shrink-0">
            <Button variant="secondary" size="sm" icon={FiFilePlus} onClick={handleNewDocument} aria-label="Buat dokumen baru">
              Dokumen Baru
            </Button>
            <Button variant="dark" size="sm" icon={FiSave} loading={saving} onClick={handleSave}>
              Simpan
            </Button>
            <Button variant="primary" size="sm" icon={FiDownload} loading={downloading} onClick={handleDownloadPdf}>
              Unduh PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={FiEye}
              onClick={() => setViewMode('preview')}
              aria-label="Pratinjau dan unduh PDF"
            >
              Pratinjau
            </Button>
            <Button variant="secondary" size="sm" icon={SiWhatsapp} onClick={handleShareWa}>
              WhatsApp
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
          <div className="flex items-center gap-1 bg-yellow-50 border border-line p-1 rounded-xl overflow-x-auto">
            <SegButton active={viewMode === 'split'} onClick={() => setViewMode('split')} icon={FiColumns}>
              Split View
            </SegButton>
            <SegButton active={viewMode === 'editor'} onClick={() => setViewMode('editor')} icon={FiEdit2}>
              Editor
            </SegButton>
            <SegButton active={viewMode === 'preview'} onClick={() => setViewMode('preview')} icon={FiMaximize2}>
              Pratinjau A4
            </SegButton>
            <SegButton
              active={viewMode === 'history'}
              onClick={() => setViewMode('history')}
              icon={FiLayers}
              badge={history.length}
            >
              Riwayat
            </SegButton>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-ink-500 shrink-0">
            <span className="tabular-nums text-xs font-bold text-yellow-800 bg-yellow-100 px-2.5 py-0.5 rounded-lg border border-yellow-300">
              {form.number}
            </span>
            <span>•</span>
            <span className="font-semibold text-ink-900">{STATUS_LABEL[form.status] || form.status}</span>
          </div>
        </div>
      </div>

      {/* ── RUANG KERJA ── */}
      {viewMode !== 'history' && (
        <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-12 items-start' : 'grid-cols-1'}`}>
          {(viewMode === 'split' || viewMode === 'editor') && (
            <div className={`${viewMode === 'split' ? 'xl:col-span-5' : 'max-w-4xl mx-auto w-full'} space-y-5 min-w-0`}>
              {/* Kartu 1: Metadata */}
              <div className={cardCls}>
                <CardHeading
                  icon={FiSliders}
                  right={
                    <div className="flex items-center p-1 bg-yellow-50 border border-line rounded-xl shrink-0">
                      {['quotation', 'invoice'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => convertType(t)}
                          className={`px-3 h-9 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            form.docType === t ? 'bg-yellow-500 text-ink-900 shadow-sm' : 'text-ink-700 hover:bg-yellow-100'
                          }`}
                        >
                          {t === 'quotation' ? 'Quotation' : 'Invoice'}
                        </button>
                      ))}
                    </div>
                  }
                >
                  Dokumen &amp; Status
                </CardHeading>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>No. Dokumen</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={form.number}
                        onChange={(e) => setField({ number: e.target.value })}
                        className={`${fieldCls} tabular-nums font-bold h-11`}
                        placeholder="QUO-202610-001"
                      />
                      <button
                        type="button"
                        onClick={() => setField({ number: generateDocNumber(form.docType, history) })}
                        title="Generate nomor baru berurutan"
                        aria-label="Generate nomor baru berurutan"
                        className="size-11 rounded-xl border border-line bg-surface hover:bg-yellow-50 text-ink-700 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                      >
                        <FiRefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <CustomListbox
                    label="Status Dokumen"
                    options={statusOptions}
                    value={form.status}
                    onChange={(v) => setField({ status: v })}
                  />

                  <DateField label="Tanggal Terbit" value={form.issueDate} onChange={(v) => setField({ issueDate: v })} />
                  <DateField
                    label={isQuo ? 'Berlaku Hingga' : 'Jatuh Tempo'}
                    value={form.dueDate}
                    onChange={(v) => setField({ dueDate: v })}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Referensi Dokumen (opsional)"
                      value={form.ref}
                      onChange={(e) => setField({ ref: e.target.value })}
                      placeholder="mis. nomor quotation asal, atau PO klien"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-line">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FiType size={12} className="text-yellow-700" /> Gaya Font Dokumen
                      </span>
                      <span className="text-xs text-yellow-800 font-semibold" style={{ fontFamily: font.family }}>
                        Pratinjau: {font.label.split(' ')[0]}
                      </span>
                    </div>
                    <CustomListbox
                      options={fontOptions}
                      value={form.docFont}
                      onChange={(v) => {
                        setField({ docFont: v });
                        toast.success(`Font dokumen diubah ke ${getFont(v).label.split(' ')[0]}`);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Kartu 2: Klien & Acara */}
              <div className={cardCls}>
                <CardHeading icon={FiUser} tone="bg-blue-50 text-info">
                  Data Klien &amp; Acara
                </CardHeading>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    label="Nama Klien *"
                    value={form.client.name}
                    onChange={(e) => setClient({ name: e.target.value })}
                    placeholder="mis. Bpk. Andika Pratama"
                  />
                  <Input
                    label="Perusahaan / Instansi"
                    value={form.client.company}
                    onChange={(e) => setClient({ company: e.target.value })}
                    placeholder="mis. PT Samudra Indonesia"
                  />
                  <Input
                    label="WhatsApp Klien *"
                    type="tel"
                    inputMode="tel"
                    value={form.client.phone}
                    onChange={(e) => setClient({ phone: e.target.value })}
                    placeholder="081234567890"
                  />
                  <Input
                    label="Email Klien"
                    type="email"
                    value={form.client.email}
                    onChange={(e) => setClient({ email: e.target.value })}
                    placeholder="client@gmail.com"
                  />
                </div>

                <div className="pt-3 border-t border-line space-y-3">
                  <div className="flex items-center gap-2">
                    <FiCalendar size={13} className="text-yellow-700" />
                    <span className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                      Detail Pelaksanaan Acara
                    </span>
                  </div>
                  <Input
                    label="Nama Acara"
                    value={form.event.name}
                    onChange={(e) => setEvent({ name: e.target.value })}
                    placeholder="mis. Wedding of Dian & Bagas"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <DateField
                      label="Tanggal Acara"
                      value={form.event.date}
                      onChange={(v) => setEvent({ date: v })}
                      clearable
                    />
                    <Input
                      label="Waktu Operasional"
                      value={form.event.time}
                      onChange={(e) => setEvent({ time: e.target.value })}
                      placeholder="mis. 18.00 - 21.00 WIB"
                    />
                  </div>
                  <Input
                    label="Lokasi / Venue"
                    value={form.event.venue}
                    onChange={(e) => setEvent({ venue: e.target.value })}
                    placeholder="mis. Grand Ballroom Hotel, Jakarta"
                  />
                </div>
              </div>

              {/* Kartu 3: Rincian Layanan */}
              <div className={cardCls}>
                <CardHeading icon={FiTag} tone="bg-orange-50 text-warning">
                  Rincian Paket &amp; Layanan ({items.length})
                </CardHeading>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-ink-500 uppercase tracking-wider block">
                    + Pilih Paket Bawaan:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setOpenPkg(openPkg === pkg.id ? null : pkg.id)}
                        aria-expanded={openPkg === pkg.id}
                        className={`min-h-11 px-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          openPkg === pkg.id
                            ? 'bg-yellow-500 text-ink-900 border-yellow-500'
                            : 'bg-surface text-ink-900 border-line hover:bg-yellow-50'
                        }`}
                      >
                        <span className="truncate">{pkg.label}</span>
                        <FiChevronDown
                          size={12}
                          className={`shrink-0 transition-transform ${openPkg === pkg.id ? 'rotate-180' : ''}`}
                        />
                      </button>
                    ))}
                  </div>
                  {packages
                    .filter((p) => p.id === openPkg)
                    .map((pkg) => (
                      <div key={pkg.id} className="rounded-2xl border border-line bg-yellow-50/60 p-2 space-y-1">
                        <div className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-800 border-b border-line">
                          {pkg.label} — Pilih Varian:
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-0.5">
                          {pkg.prices.map((pr, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyPreset(pkg, pr)}
                              className="w-full min-h-11 text-left px-2.5 py-2 rounded-xl text-xs text-ink-900 hover:bg-yellow-500 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="font-medium">
                                {pr.label} {pr.sub ? `(${pr.sub})` : ''}
                              </span>
                              <span className="tabular-nums font-bold text-xs shrink-0">{formatRupiah(pr.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="space-y-3 pt-1">
                  {items.map((item, idx) => (
                    <div key={item.id} className="p-3.5 rounded-xl border border-line bg-bg space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-xs tabular-nums font-bold text-yellow-800 border border-yellow-300 shrink-0">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(idx, { name: e.target.value })}
                            placeholder="Nama Layanan / Paket..."
                            aria-label={`Nama layanan ${idx + 1}`}
                            className="flex-1 min-w-0 bg-transparent border-b border-line focus:border-yellow-500 text-sm font-bold text-ink-900 outline-none py-1 transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="size-11 -mr-1 flex items-center justify-center text-ink-500 hover:text-danger rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          aria-label={`Hapus baris ${idx + 1}`}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Rincian fitur/fasilitas yang sudah termasuk..."
                        aria-label={`Rincian layanan ${idx + 1}`}
                        className="w-full bg-surface text-xs text-ink-700 border border-line focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 rounded-lg p-2.5 resize-none leading-relaxed transition-colors"
                      />

                      <div className="grid grid-cols-3 gap-2.5 items-end">
                        <div>
                          <span className="text-xs uppercase font-bold text-ink-500 block mb-1">Qty</span>
                          <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={item.qty}
                            onChange={(e) => updateItem(idx, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            aria-label={`Jumlah ${idx + 1}`}
                            className="w-full h-11 bg-surface border border-line rounded-lg px-2.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-yellow-500 tabular-nums tabular-nums text-center font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-xs uppercase font-bold text-ink-500 block mb-1">Harga (Rp)</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatThousand(item.unitPrice)}
                            onChange={(e) => updateItem(idx, { unitPrice: parseRawNumber(e.target.value) })}
                            aria-label={`Harga satuan ${idx + 1}`}
                            className="w-full h-11 bg-surface border border-line rounded-lg px-2.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-yellow-500 tabular-nums text-right tabular-nums font-medium"
                          />
                        </div>
                        <div className="text-right min-w-0">
                          <span className="text-xs uppercase font-bold text-ink-500 block mb-1">Subtotal</span>
                          <span className="text-xs font-bold text-yellow-800 tabular-nums tabular-nums block py-3 truncate">
                            {formatRupiah(item.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => addItem()}
                    className="flex items-center gap-1.5 px-3 min-h-11 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-700 hover:bg-yellow-50 transition-colors cursor-pointer"
                  >
                    <FiPlus size={13} /> Tambah Item Bebas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addItem({
                        id: newItemId(),
                        name: 'Tambah Waktu Sewa (1 Jam)',
                        description: '• Penambahan durasi operasional photobooth di luar paket awal (tanpa cetak tambahan)',
                        qty: 1,
                        unitPrice: 500000,
                        total: 500000,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 min-h-11 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-700 hover:bg-yellow-50 transition-colors cursor-pointer"
                  >
                    <FiPlus size={13} /> Tambah Waktu (500rb)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addItem({
                        id: newItemId(),
                        name: 'Biaya Transport Luar Kota',
                        description: '• Akomodasi dan transportasi logistik & kru photobooth ke luar area Jabodetabek',
                        qty: 1,
                        unitPrice: 350000,
                        total: 350000,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 min-h-11 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-700 hover:bg-yellow-50 transition-colors cursor-pointer"
                  >
                    <FiPlus size={13} /> Transport Luar Kota
                  </button>
                </div>
              </div>

              {/* Kartu 4: Ringkasan Finansial */}
              <div className={cardCls}>
                <CardHeading icon={FiDollarSign} tone="bg-green-50 text-success">
                  Ringkasan Finansial
                </CardHeading>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ink-500">Subtotal Layanan:</span>
                    <span className="tabular-nums font-semibold tabular-nums text-ink-900">{formatRupiah(doc.subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1">
                    <span className="text-ink-500">Potongan Diskon (Rp):</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.discount}
                      onChange={(e) => setField({ discount: formatThousand(e.target.value) })}
                      placeholder="0"
                      aria-label="Potongan diskon"
                      className="w-36 h-11 bg-surface border border-line rounded-lg px-2.5 text-sm text-right tabular-nums tabular-nums text-ink-900 outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1">
                    <span className="text-ink-500">Pajak (PPN):</span>
                    <div className="w-44 shrink-0">
                      <CustomListbox options={TAX_OPTIONS} value={form.taxRate} onChange={(v) => setField({ taxRate: v })} />
                    </div>
                  </div>
                  {doc.taxAmount > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-ink-500">PPN {doc.taxRate}%:</span>
                      <span className="tabular-nums font-semibold tabular-nums text-ink-900">{formatRupiah(doc.taxAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-yellow-50 border border-yellow-300">
                    <div className="min-w-0">
                      <span className="font-bold text-xs uppercase tracking-wider text-ink-900 block">
                        Total Biaya Dokumen:
                      </span>
                      <span className="text-xs text-ink-500">
                        {isQuo ? 'Estimasi total penawaran' : 'Total tagihan resmi'}
                      </span>
                    </div>
                    <span className="font-bold text-base text-yellow-800 tabular-nums tabular-nums shrink-0">
                      {formatRupiah(doc.totalAmount)}
                    </span>
                  </div>

                  {!isQuo && (
                    <>
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-line">
                        <div className="min-w-0">
                          <span className="font-medium text-ink-900 block">Uang Muka (DP) Terbayar (Rp):</span>
                          <span className="text-xs text-ink-500">
                            {form.status === 'partial' ? (
                              <span className="text-success font-semibold">✓ Status aktif: DP Terbayar</span>
                            ) : (
                              'Status saat ini bukan DP'
                            )}
                          </span>
                        </div>
                        <div className="w-36 flex flex-col items-end gap-1 shrink-0">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={form.status === 'partial' ? form.downPayment : ''}
                            onChange={(e) => setField({ downPayment: formatThousand(e.target.value) })}
                            disabled={form.status !== 'partial'}
                            placeholder={form.status === 'partial' ? '0' : '- (Terkunci)'}
                            aria-label="Uang muka DP"
                            className="w-full h-11 border border-line rounded-lg px-2.5 text-sm text-right tabular-nums tabular-nums font-semibold outline-none focus:ring-2 focus:ring-yellow-500 bg-surface text-ink-900 disabled:bg-yellow-50/50 disabled:text-ink-500 disabled:cursor-not-allowed"
                          />
                          {form.status !== 'partial' && (
                            <button
                              type="button"
                              onClick={() => setField({ status: 'partial' })}
                              className="text-xs text-yellow-800 hover:underline font-semibold cursor-pointer min-h-8"
                            >
                              + Aktifkan Input DP
                            </button>
                          )}
                        </div>
                      </div>

                      {form.status === 'partial' && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-ink-500">Tanggal Terima DP:</span>
                          <div className="w-44 shrink-0">
                            <DateField value={form.dpDate} onChange={(v) => setField({ dpDate: v })} clearable />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-line bg-bg">
                        <div className="min-w-0">
                          <span className="font-bold text-xs uppercase tracking-wider text-ink-700 block">
                            Sisa Pelunasan (Balance Due)
                          </span>
                          <span className="text-xs text-ink-500">
                            {form.status === 'paid' ? 'Tagihan sudah lunas sepenuhnya' : 'Wajib diselesaikan H-1 sebelum acara'}
                          </span>
                        </div>
                        <span
                          className={`font-bold text-base tabular-nums tabular-nums shrink-0 ${
                            form.status === 'paid' ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {form.status === 'paid' ? 'Rp 0 (LUNAS)' : formatRupiah(doc.balanceDue)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Kartu 5: S&K, Catatan, Stempel */}
              <div className={cardCls}>
                <CardHeading
                  icon={FiFileText}
                  tone="bg-yellow-100 text-yellow-800"
                  right={
                    <button
                      type="button"
                      onClick={() => setField({ tncList: profile?.terms?.length ? profile.terms : DEFAULT_TNC_ITEMS })}
                      className="text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors cursor-pointer min-h-11 px-1 shrink-0"
                    >
                      Reset Bawaan
                    </button>
                  }
                >
                  Syarat &amp; Ketentuan ({form.tncList.length})
                </CardHeading>

                <div className="space-y-2">
                  {form.tncList.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-yellow-50 border border-line text-xs tabular-nums text-ink-500 flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={t}
                        onChange={(e) => {
                          const copy = [...form.tncList];
                          copy[i] = e.target.value;
                          setField({ tncList: copy });
                        }}
                        aria-label={`Syarat ${i + 1}`}
                        className="flex-1 min-w-0 h-11 bg-surface border border-line rounded-lg px-2.5 text-xs text-ink-900 outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setField({ tncList: form.tncList.filter((_, idx) => idx !== i) })}
                        className="size-11 flex items-center justify-center text-ink-500 hover:text-danger rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        aria-label={`Hapus syarat ${i + 1}`}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setField({ tncList: [...form.tncList, ''] })}
                  className="text-xs text-yellow-800 hover:underline flex items-center gap-1.5 cursor-pointer font-semibold min-h-11"
                >
                  <FiPlus size={13} /> Tambah Poin Syarat
                </button>

                <div className="pt-3 border-t border-line space-y-1.5">
                  <label className={labelCls} htmlFor="invoice-notes">
                    Catatan Penutup untuk Klien
                  </label>
                  <textarea
                    id="invoice-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField({ notes: e.target.value })}
                    className={`${fieldCls} resize-none leading-relaxed`}
                  />
                </div>

                <div className="pt-3 border-t border-line space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-ink-900 block">Cap Stempel Resmi Memoribox</span>
                      <span className="text-xs text-ink-500">Stempel resmi pada tanda tangan dokumen</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.showStamp}
                      aria-label="Tampilkan cap stempel"
                      onClick={() => setField({ showStamp: !form.showStamp })}
                      className="flex items-center gap-2 min-h-11 cursor-pointer shrink-0"
                    >
                      <span
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          form.showStamp ? 'bg-yellow-500' : 'bg-ink-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                            form.showStamp ? 'translate-x-4' : ''
                          }`}
                        />
                      </span>
                      <span className={`text-xs font-bold ${form.showStamp ? 'text-success' : 'text-ink-500'}`}>
                        {form.showStamp ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </button>
                  </div>

                  {form.showStamp && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-ink-500">Model Cap Stempel:</span>
                      <div className="flex items-center gap-1 bg-yellow-50 p-1 rounded-xl border border-line">
                        {[
                          ['oval', 'Oval (Bisnis)'],
                          ['round', 'Bulat'],
                        ].map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setField({ stampShape: val })}
                            className={`px-3 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              form.stampShape === val ? 'bg-yellow-500 text-ink-900 shadow-sm' : 'text-ink-700 hover:bg-yellow-100'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kartu 6: Rekening */}
              <div className={cardCls}>
                <CardHeading
                  icon={FiCreditCard}
                  tone="bg-blue-50 text-info"
                  right={
                    <button
                      type="button"
                      onClick={() => setIsBankEditing((v) => !v)}
                      className="text-xs font-semibold text-ink-500 hover:text-ink-900 flex items-center gap-1 cursor-pointer min-h-11 px-1 shrink-0"
                    >
                      <FiEdit2 size={12} /> {isBankEditing ? 'Tutup Edit' : 'Ubah Rekening'}
                    </button>
                  }
                >
                  Rekening Pembayaran
                </CardHeading>

                {isBankEditing ? (
                  <div className="space-y-3 pt-1">
                    <Input
                      label="Nama Bank"
                      value={form.bankInfo.bankName}
                      onChange={(e) => setField({ bankInfo: { ...form.bankInfo, bankName: e.target.value } })}
                      placeholder="mis. Bank BCA / Bank Jago"
                    />
                    <Input
                      label="Nomor Rekening"
                      inputMode="numeric"
                      value={form.bankInfo.accountNumber}
                      onChange={(e) => setField({ bankInfo: { ...form.bankInfo, accountNumber: e.target.value } })}
                      placeholder="1023 0289 6677"
                    />
                    <Input
                      label="Atas Nama"
                      value={form.bankInfo.accountHolder}
                      onChange={(e) => setField({ bankInfo: { ...form.bankInfo, accountHolder: e.target.value } })}
                      placeholder="Nama pemilik rekening"
                    />
                    <Input
                      label="Catatan QRIS / Metode Tambahan"
                      value={form.bankInfo.qrisNote}
                      onChange={(e) => setField({ bankInfo: { ...form.bankInfo, qrisNote: e.target.value } })}
                      placeholder="Tersedia QRIS All Payment..."
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-bg border border-line space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-500">Bank Tujuan:</span>
                      <span className="font-bold text-ink-900 text-right">{form.bankInfo.bankName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-500">Nomor Rekening:</span>
                      <span className="tabular-nums font-bold text-yellow-800">{form.bankInfo.accountNumber}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-500">Atas Nama:</span>
                      <span className="font-medium text-ink-900 text-right">{form.bankInfo.accountHolder}</span>
                    </div>
                    {form.bankInfo.qrisNote && (
                      <p className="text-xs text-ink-500 pt-1.5 border-t border-line italic">{form.bankInfo.qrisNote}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── KANVAS A4 ── */}
          {hasPreview && (
            <div className={`${viewMode === 'split' ? 'xl:col-span-7 xl:sticky xl:top-0' : 'max-w-[850px] mx-auto w-full'} min-w-0`}>
              <div className="flex items-center justify-between gap-2 pb-3 px-1 overflow-x-auto">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface border border-line text-xs font-bold text-ink-900 shadow-card shrink-0">
                    <FiFileText size={13} className="text-yellow-700" /> A4 (210 × 297 mm)
                  </span>
                  <span className="text-xs tabular-nums text-ink-500 font-bold px-2.5 h-9 inline-flex items-center rounded-xl bg-yellow-50 border border-line shrink-0">
                    {Math.round(activeScale * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('custom');
                      setZoomLevel(Math.max(0.3, Number(((zoomMode === 'custom' ? zoomLevel : activeScale) - 0.1).toFixed(2))));
                    }}
                    className="size-11 flex items-center justify-center rounded-xl bg-surface border border-line text-ink-700 hover:bg-yellow-50 transition-colors cursor-pointer"
                    aria-label="Perkecil 10%"
                  >
                    <FiZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('fit')}
                    className={`px-3 h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      zoomMode === 'fit'
                        ? 'bg-yellow-500 text-ink-900 border-yellow-500'
                        : 'bg-surface border-line text-ink-700 hover:bg-yellow-50'
                    }`}
                  >
                    Fit Layar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('custom');
                      setZoomLevel(1);
                    }}
                    className={`px-3 h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      zoomMode === 'custom' && zoomLevel === 1
                        ? 'bg-yellow-500 text-ink-900 border-yellow-500'
                        : 'bg-surface border-line text-ink-700 hover:bg-yellow-50'
                    }`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('custom');
                      setZoomLevel(Math.min(1.5, Number(((zoomMode === 'custom' ? zoomLevel : activeScale) + 0.1).toFixed(2))));
                    }}
                    className="size-11 flex items-center justify-center rounded-xl bg-surface border border-line text-ink-700 hover:bg-yellow-50 transition-colors cursor-pointer"
                    aria-label="Perbesar 10%"
                  >
                    <FiZoomIn size={14} />
                  </button>
                </div>
              </div>

              <div
                ref={previewContainerRef}
                className="w-full rounded-2xl bg-yellow-50 border border-line p-3 sm:p-6 flex flex-col items-center overflow-x-auto min-h-[420px] relative"
              >
                <div
                  style={{
                    width: `${A4_WIDTH * activeScale}px`,
                    height: `${docHeight * activeScale}px`,
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <InvoiceSheet doc={sheetDoc} company={profile || {}} scale={activeScale} sheetRef={sheetRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RIWAYAT ── */}
      {viewMode === 'history' && (
        <div className="bg-surface p-4 sm:p-6 rounded-2xl border border-line shadow-card space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: 'Total Dokumen', value: historyStats.total, icon: FiFileText, tone: 'bg-yellow-100 text-yellow-800' },
              { label: 'Quotation', value: historyStats.quo, icon: FiFilePlus, tone: 'bg-orange-50 text-warning' },
              { label: 'Invoice', value: historyStats.inv, icon: FiDollarSign, tone: 'bg-blue-50 text-info' },
              {
                label: 'Tagihan Lunas',
                value: historyStats.paidCount,
                sub: formatRupiah(historyStats.paidVal),
                icon: FiCheckCircle,
                tone: 'bg-green-50 text-success',
              },
            ].map((k) => (
              <div key={k.label} className="p-4 rounded-xl bg-bg border border-line flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-xs uppercase font-bold text-ink-500 tracking-wider block truncate">{k.label}</span>
                  <span className="text-xl font-bold text-ink-900 tabular-nums">{k.value}</span>
                  {k.sub && <span className="text-xs text-ink-500 block tabular-nums truncate">{k.sub}</span>}
                </div>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${k.tone}`}>
                  <k.icon size={18} />
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-line">
            <div>
              <h3 className="text-base font-bold text-ink-900">Daftar Dokumen Tersimpan</h3>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="relative sm:w-64">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" size={15} />
                <input
                  type="text"
                  placeholder="Cari klien / no. dokumen..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  aria-label="Cari dokumen"
                  className="w-full h-11 bg-surface border border-line rounded-xl pl-10 pr-3.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-ink-300"
                />
              </div>
              <div className="sm:w-56">
                <CustomListbox
                  options={[
                    { value: 'all', label: 'Semua Jenis Dokumen' },
                    { value: 'quotation', label: 'Quotation (Penawaran)' },
                    { value: 'invoice', label: 'Invoice (Tagihan)' },
                  ]}
                  value={filterType}
                  onChange={setFilterType}
                />
              </div>
            </div>
          </div>

          {loadError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-warning">
              <FiCloudOff size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Gagal memuat dari cloud.</p>
                <p className="text-ink-700">Menampilkan cadangan browser.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={loadHistory}>
                Coba Lagi
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr className="border-b border-line text-ink-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">No. Dokumen</th>
                  <th className="py-3 px-4">Klien &amp; Acara</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loadingHistory ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-2 px-4">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-ink-500">
                      {history.length === 0
                        ? 'Belum ada dokumen yang disimpan. Klik "Dokumen Baru" untuk membuat penawaran atau invoice.'
                        : 'Tidak ada dokumen yang cocok dengan pencarian.'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((d) => {
                    const dQuo = d.docType === 'quotation';
                    const ok = d.status === 'paid' || d.status === 'approved';
                    return (
                      <tr key={d.id} className="hover:bg-yellow-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                              dQuo
                                ? 'bg-orange-50 text-warning border-orange-200'
                                : 'bg-blue-50 text-info border-blue-200'
                            }`}
                          >
                            {d.docType}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold text-ink-900">
                          {d.number}
                          {d.localOnly && (
                            <span className="ml-2 text-xs font-sans font-semibold text-warning">Lokal</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-ink-900">{d.client?.name || '-'}</p>
                          {d.event?.name && <p className="text-xs text-ink-500">{d.event.name}</p>}
                        </td>
                        <td className="py-3 px-4 text-ink-500">{formatDateIndo(d.issueDate)}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-yellow-800">
                          {formatRupiah(d.totalAmount)}
                          {!dQuo && d.balanceDue > 0 && (
                            <span className="block text-xs text-danger font-normal">
                              Sisa: {formatRupiah(d.balanceDue)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${
                              ok
                                ? 'bg-green-50 text-success'
                                : d.status === 'partial'
                                ? 'bg-blue-50 text-info'
                                : d.status === 'draft'
                                ? 'bg-yellow-50 text-ink-700'
                                : 'bg-red-50 text-danger'
                            }`}
                          >
                            {STATUS_LABEL[d.status] || d.status}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoad(d, 'split')}
                              className="size-11 flex items-center justify-center rounded-lg bg-yellow-50 hover:bg-yellow-500 text-ink-900 transition-colors cursor-pointer"
                              aria-label={`Buka dan edit ${d.number}`}
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoad(d, 'preview')}
                              className="size-11 flex items-center justify-center rounded-lg bg-yellow-50 hover:bg-yellow-100 text-ink-700 transition-colors cursor-pointer"
                              aria-label={`Pratinjau ${d.number}`}
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(d)}
                              className="size-11 flex items-center justify-center rounded-lg bg-yellow-50 hover:bg-yellow-100 text-ink-700 transition-colors cursor-pointer"
                              aria-label={`Duplikat ${d.number}`}
                            >
                              <FiCopy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d)}
                              className="size-11 flex items-center justify-center rounded-lg bg-yellow-50 hover:bg-red-50 text-ink-700 hover:text-danger transition-colors cursor-pointer"
                              aria-label={`Hapus ${d.number}`}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInvoice;
