'use client';

import React, { memo } from 'react';
import { MEMORIBOX_LOGO_BASE64 } from '@/assets/logoBase64';
import { formatRupiah } from '@/lib/utils';
import { formatDateIndo, getFont, terbilang, STATUS_LABEL } from '@/lib/invoiceUtils';

const WATERMARK = { paid: 'LUNAS', draft: 'DRAFT', declined: 'DITOLAK' };

const BADGE_TONE = {
  paid: 'border-success text-success',
  approved: 'border-success text-success',
  partial: 'border-yellow-700 text-yellow-800',
  unpaid: 'border-danger text-danger',
  declined: 'border-danger text-danger',
  draft: 'border-ink-500 text-ink-500',
  sent: 'border-ink-700 text-ink-700',
};

const Label = ({ children }) => (
  <span className="text-[9px] uppercase font-bold tracking-[0.14em] text-ink-500 block">{children}</span>
);

/**
 * Lembar A4 resmi (#printable-document): lebar 794px, tinggi minimal 1123px.
 * Logo wajib Base64 tersemat agar html2canvas-pro bebas CORS tainting.
 */
function InvoiceSheetBase({ doc, company = {}, scale = 1, sheetRef }) {
  const isQuo = doc.docType === 'quotation';
  const font = getFont(doc.docFont);
  const { client, event, items, bankInfo, notes } = doc;
  const terms = doc.tncList.filter(Boolean);
  const dpActive = !isQuo && doc.status === 'partial' && doc.downPayment > 0;
  const watermark = WATERMARK[doc.status];
  const taxAmount = doc.taxAmount || 0;

  return (
    <div
      id="printable-document"
      ref={sheetRef}
      className="bg-white text-ink-900 shadow-float border border-line relative overflow-hidden"
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '44px 48px 36px',
        boxSizing: 'border-box',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        '--selected-font': font.family,
      }}
    >
      {/* Aksen brand di tepi atas */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-500" />

      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[120px] font-black tracking-[0.2em] text-ink-900 opacity-[0.04] -rotate-24">
            {watermark}
          </span>
        </div>
      )}

      <div className="relative">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MEMORIBOX_LOGO_BASE64} alt="Memoribox" className="h-14 w-auto object-contain" />
            <div className="mt-2.5 text-[11px] text-ink-700 leading-relaxed">
              <p className="font-bold text-ink-900 text-xs">{company.name || 'MemoriBox'}</p>
              {company.address && <p>{company.address}</p>}
              {(company.phoneDisplay || company.whatsapp) && (
                <p>
                  WhatsApp <span className="font-mono text-ink-900">{company.phoneDisplay || `+${company.whatsapp}`}</span>
                  {company.email ? ` · ${company.email}` : ''}
                </p>
              )}
              {company.instagram && <p>Instagram @{company.instagram}</p>}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-[26px] font-black uppercase tracking-[0.12em] text-ink-900 leading-none">
              {isQuo ? 'Penawaran Harga' : 'Invoice'}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mt-1.5">
              {isQuo ? 'Quotation' : 'Faktur Tagihan'}
            </p>
            <p className="font-mono text-sm font-bold text-ink-900 mt-2">{doc.number || '-'}</p>
            <span
              className={`inline-block mt-2 px-3 py-0.5 border-2 rounded text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                BADGE_TONE[doc.status] || 'border-ink-500 text-ink-500'
              }`}
            >
              {STATUS_LABEL[doc.status] || doc.status}
            </span>
          </div>
        </div>

        {/* STRIP META */}
        <div className="grid grid-cols-4 mt-6 border-y-2 border-ink-900 divide-x divide-line">
          <div className="py-2 pr-3">
            <Label>Tanggal Terbit</Label>
            <p className="text-xs font-semibold mt-0.5">{formatDateIndo(doc.issueDate)}</p>
          </div>
          <div className="py-2 px-3">
            <Label>{isQuo ? 'Berlaku Hingga' : 'Jatuh Tempo'}</Label>
            <p className="text-xs font-semibold mt-0.5">{formatDateIndo(doc.dueDate)}</p>
          </div>
          <div className="py-2 px-3">
            <Label>Tanggal Acara</Label>
            <p className="text-xs font-semibold mt-0.5">{event.date ? formatDateIndo(event.date) : '-'}</p>
          </div>
          <div className="py-2 pl-3">
            <Label>{doc.ref ? 'Referensi' : 'Waktu Acara'}</Label>
            <p className="text-xs font-semibold mt-0.5 font-mono">{doc.ref || event.time || '-'}</p>
          </div>
        </div>

        {/* KLIEN & ACARA */}
        <div className="grid grid-cols-2 gap-6 mt-5">
          <div>
            <Label>{isQuo ? 'Ditujukan Kepada' : 'Ditagihkan Kepada'}</Label>
            <h3 className="text-[15px] font-bold leading-snug mt-1">{client.name || 'Nama Klien'}</h3>
            {client.company && <p className="text-xs text-ink-700 mt-0.5">{client.company}</p>}
            <div className="mt-1.5 text-[11px] text-ink-700 space-y-0.5">
              {client.phone && <p>WhatsApp: <span className="font-mono text-ink-900">{client.phone}</span></p>}
              {client.email && <p>Email: <span className="text-ink-900">{client.email}</span></p>}
            </div>
          </div>
          <div>
            <Label>Detail Acara</Label>
            <h3 className="text-[15px] font-bold leading-snug mt-1">{event.name || 'Nama acara belum diisi'}</h3>
            <div className="mt-1.5 text-[11px] text-ink-700 space-y-0.5">
              {event.time && <p>Waktu: <span className="text-ink-900">{event.time}</span></p>}
              <p>Lokasi: <span className="text-ink-900">{event.venue || '-'}</span></p>
            </div>
          </div>
        </div>

        {/* TABEL LAYANAN */}
        <table className="w-full text-left border-collapse mt-6">
          <thead>
            <tr className="bg-ink-900 text-white text-[9px] font-bold uppercase tracking-[0.12em]">
              <th className="py-2 px-2 w-9 text-center">No</th>
              <th className="py-2 px-3">Layanan &amp; Rincian</th>
              <th className="py-2 px-2 text-center w-12">Qty</th>
              <th className="py-2 px-2 text-right w-28">Harga Satuan</th>
              <th className="py-2 px-3 text-right w-28">Jumlah</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {items.map((item, i) => (
              <tr key={item.id || i} className="align-top border-b border-line">
                <td className="py-2.5 px-2 text-center font-mono text-ink-500">{i + 1}</td>
                <td className="py-2.5 px-3">
                  <p className="font-bold text-[13px] leading-snug">{item.name || '-'}</p>
                  {item.description && (
                    <div className="text-[10.5px] text-ink-700 mt-1 space-y-px">
                      {item.description
                        .split('\n')
                        .filter(Boolean)
                        .map((line, idx) => (
                          <p key={idx} className="leading-snug">
                            {line}
                          </p>
                        ))}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-semibold">{item.qty}</td>
                <td className="py-2.5 px-2 text-right font-mono text-ink-700">{formatRupiah(item.unitPrice)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">{formatRupiah(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PEMBAYARAN & TOTAL */}
        <div className="grid grid-cols-12 gap-8 mt-6 items-start">
          <div className="col-span-7">
            <Label>Informasi Pembayaran</Label>
            <table className="mt-2 text-[11px] w-full">
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-1.5 w-24 text-ink-500">Bank</td>
                  <td className="py-1.5 font-semibold">{bankInfo.bankName}</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-1.5 text-ink-500">No. Rekening</td>
                  <td className="py-1.5 font-mono font-bold text-[13px] tracking-wide">{bankInfo.accountNumber}</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-1.5 text-ink-500">Atas Nama</td>
                  <td className="py-1.5 font-semibold">{bankInfo.accountHolder}</td>
                </tr>
              </tbody>
            </table>
            {bankInfo.qrisNote && <p className="text-[10px] text-ink-500 mt-2 leading-snug">{bankInfo.qrisNote}</p>}
            <p className="text-[10.5px] text-ink-700 mt-4 leading-snug">
              <span className="font-bold text-ink-900">Terbilang: </span>
              <span className="italic">{terbilang(doc.totalAmount)}</span>
            </p>
          </div>

          <div className="col-span-5 text-xs">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 text-ink-700">Subtotal</td>
                  <td className="py-1 text-right font-mono font-semibold">{formatRupiah(doc.subtotal)}</td>
                </tr>
                {doc.discount > 0 && (
                  <tr>
                    <td className="py-1 text-ink-700">Diskon</td>
                    <td className="py-1 text-right font-mono font-semibold text-success">-{formatRupiah(doc.discount)}</td>
                  </tr>
                )}
                {taxAmount > 0 && (
                  <tr>
                    <td className="py-1 text-ink-700">PPN {doc.taxRate}%</td>
                    <td className="py-1 text-right font-mono font-semibold">{formatRupiah(taxAmount)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-ink-900">
                  <td className="pt-2 pb-1 text-[13px] font-extrabold">{isQuo ? 'Total Penawaran' : 'Total Tagihan'}</td>
                  <td className="pt-2 pb-1 text-right font-mono text-[14px] font-extrabold">{formatRupiah(doc.totalAmount)}</td>
                </tr>
                {dpActive && (
                  <tr>
                    <td className="py-1 text-ink-700">DP terbayar{doc.dpDate ? ` (${formatDateIndo(doc.dpDate)})` : ''}</td>
                    <td className="py-1 text-right font-mono font-semibold text-success">-{formatRupiah(doc.downPayment)}</td>
                  </tr>
                )}
                {!isQuo && (dpActive || doc.status === 'paid') && (
                  <tr className="border-t border-ink-300">
                    <td className="pt-2 text-[12px] font-bold">{doc.status === 'paid' ? 'Status' : 'Sisa Pelunasan'}</td>
                    <td
                      className={`pt-2 text-right font-mono text-[13px] font-extrabold ${
                        doc.status === 'paid' ? 'text-success' : 'text-ink-900'
                      }`}
                    >
                      {doc.status === 'paid' ? 'LUNAS' : formatRupiah(doc.balanceDue)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {!isQuo && doc.status !== 'paid' && (
              <p className="text-[10px] text-ink-500 mt-2 text-right">Pelunasan paling lambat H-1 acara</p>
            )}
          </div>
        </div>

        {/* SYARAT & KETENTUAN */}
        {terms.length > 0 && (
          <div className="mt-6 pt-4 border-t border-line">
            <Label>Syarat &amp; Ketentuan</Label>
            <ol className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-[9.5px] text-ink-700 leading-snug list-decimal list-inside">
              {terms.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ol>
          </div>
        )}

        {notes && (
          <p className="mt-4 text-[10.5px] text-ink-700 leading-snug italic border-l-2 border-yellow-500 pl-3">
            {notes}
          </p>
        )}

        {/* TANDA TANGAN */}
        <div className="grid grid-cols-2 gap-10 mt-6 text-xs">
          <div className="text-center">
            <p className="text-[10px] text-ink-500">{isQuo ? 'Disetujui oleh,' : 'Penerima,'}</p>
            <div className="h-20" />
            <p className="font-bold border-t border-ink-300 pt-1.5 inline-block min-w-[160px]">
              {client.name || '( Nama Klien )'}
            </p>
          </div>

          <div className="text-center relative">
            <p className="text-[10px] text-ink-500">Hormat kami,</p>
            <div className="h-20 relative flex items-center justify-center">
              {doc.showStamp && doc.stampShape === 'oval' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10">
                  <svg viewBox="0 0 200 120" width="152" className="text-yellow-700 -rotate-6 opacity-90">
                    <defs>
                      <path id="oval-stamp-top" d="M 45,36 A 60,14 0 0,1 155,36" fill="none" />
                    </defs>
                    <ellipse cx="100" cy="60" rx="95" ry="55" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <ellipse cx="100" cy="60" rx="89" ry="49" fill="none" stroke="currentColor" strokeWidth="0.8" />
                    <text fill="currentColor" fontSize="9.5" fontWeight="900" letterSpacing="2.2" fontFamily="sans-serif">
                      <textPath href="#oval-stamp-top" startOffset="50%" textAnchor="middle">
                        MEMORIBOX
                      </textPath>
                    </text>
                    <text x="100" y="44" fill="currentColor" fontSize="8" fontWeight="800" letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">
                      PHOTOBOOTH
                    </text>
                    <line x1="18" y1="52" x2="182" y2="52" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="18" y1="76" x2="182" y2="76" stroke="currentColor" strokeWidth="1.2" />
                    <text x="100" y="66" fill="currentColor" fontSize="11" fontWeight="900" letterSpacing="2.5" textAnchor="middle" fontFamily="sans-serif">
                      ★ MANAGEMENT ★
                    </text>
                    <text x="100" y="97" fill="currentColor" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                      ★
                    </text>
                  </svg>
                </div>
              )}

              {doc.showStamp && doc.stampShape === 'round' && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10">
                  <svg viewBox="0 0 160 160" width="112" height="112" className="text-yellow-700 -rotate-6 opacity-90">
                    <defs>
                      <path id="round-stamp-top" d="M 36,48 A 50,50 0 0,1 124,48" fill="none" />
                    </defs>
                    <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="80" cy="80" r="69" fill="none" stroke="currentColor" strokeWidth="0.8" />
                    <text fill="currentColor" fontSize="10" fontWeight="900" letterSpacing="2.2" fontFamily="sans-serif">
                      <textPath href="#round-stamp-top" startOffset="50%" textAnchor="middle">
                        MEMORIBOX
                      </textPath>
                    </text>
                    <text x="80" y="55" fill="currentColor" fontSize="8" fontWeight="800" letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">
                      PHOTOBOOTH
                    </text>
                    <line x1="18" y1="68" x2="142" y2="68" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="18" y1="94" x2="142" y2="94" stroke="currentColor" strokeWidth="1.2" />
                    <text x="80" y="83" fill="currentColor" fontSize="11.5" fontWeight="900" letterSpacing="2.5" textAnchor="middle" fontFamily="sans-serif">
                      ★ MANAGEMENT ★
                    </text>
                    <text x="80" y="124" fill="currentColor" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                      ★
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <p className="font-bold border-t border-ink-300 pt-1.5 inline-block min-w-[160px] relative z-10">
              Memoribox Management
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-6 pt-2.5 border-t border-line flex items-center justify-between text-[9px] text-ink-500">
          <p>Dokumen ini diterbitkan oleh {company.name || 'MemoriBox'} · {doc.number}</p>
          <p className="font-mono">MemoriBox.id</p>
        </div>
      </div>
    </div>
  );
}

export const InvoiceSheet = memo(InvoiceSheetBase);
export default InvoiceSheet;
