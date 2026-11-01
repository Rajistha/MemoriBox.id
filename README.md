<div align="center">

<img src="public/logo.png" alt="MemoriBox.id" width="220" />

### Platform website dan operasional photobooth & photobox

Landing page profesional, admin lengkap, antrean digital, dan album sesi foto dalam satu sistem.

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)
![Supabase](https://img.shields.io/badge/Supabase-0B2B1E?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

---

## Tentang

**MemoriBox.id** adalah penyedia jasa photobooth dan photobox untuk wilayah Jabodetabek dan Bali. Proyek ini menyatukan situs publik dan seluruh kebutuhan operasional harian dalam satu basis kode, dari pemesanan sampai laporan keuangan acara.

## Fitur

### Situs publik

- Landing page dengan hero, layanan, paket, galeri, lokasi offline, ulasan, FAQ, dan kontak.
- Halaman tersendiri untuk tiap paket, galeri lengkap, cek jadwal, dan kalkulator paket.
- Kalender ketersediaan tanggal acara yang terhubung langsung dengan jadwal admin.
- Hero bisa menampilkan foto galeri dan logo klien yang bergerak selang-seling.
- Halaman bio-link publik dan pemendek tautan.

### Admin

- **Dashboard**: ringkasan pemasukan, laba, dan target.
- **Kas**: pemasukan per acara, biaya operasional, rekapitulasi laba, dan target.
- **Invoice & Quotation**: template A4 profesional dengan pratinjau dan unduh PDF.
- **Jadwal**: menambah jadwal otomatis membuat acara yang tersambung ke Kas, Antrean, dan Sesi.
- **Konten**: profil bisnis, layanan, paket dan harga, galeri, logo klien, ulasan, dan lokasi offline, semuanya bisa diedit tanpa menyentuh kode.
- **Tautan & Shortlink**: kelola bio-link dan tautan pendek.
- **Pemakaian server**: pantau penyimpanan dan penggunaan.

### Operasional acara

- **Antrean digital**: tamu mengambil nomor lewat QR, dipanggil di layar TV dengan bunyi panggilan, dan dikelola kru lewat terminal khusus.
- **Sesi foto**: halaman pelanggan berisi hitung mundur dan album, ditambah input sesi oleh kru.
- **Bagi hasil**: pemasukan dan bagi hasil dihitung otomatis dari data sesi, dengan mode voucher atau persentase.

## Arsitektur multi-domain

Satu aplikasi melayani lima ranah. Pemisahan dilakukan di `src/proxy.js` berdasarkan nama host.

| Alamat               | Fungsi                                           |
| -------------------- | ------------------------------------------------ |
| `memoribox.id`       | Landing page dan shortlink                       |
| `app.memoribox.id`   | Seluruh admin (wajib login)                      |
| `link.memoribox.id`  | Halaman bio-link publik                          |
| `live.memoribox.id`  | Sesi pelanggan dan input kru sesi                |
| `queue.memoribox.id` | Antrean tamu, layar TV, kios QR, dan kru antrean |

## Teknologi

| Lapisan            | Pilihan                                              |
| ------------------ | ---------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19                    |
| Tampilan           | Tailwind CSS v4, React Icons                         |
| Data & autentikasi | Supabase (PostgreSQL, Auth, Realtime, RPC)           |
| Dokumen            | html2canvas-pro dan jsPDF untuk PDF A4 di sisi klien |
| Grafik             | Recharts                                             |
| Hosting            | Vercel                                               |

## Struktur proyek

```text
src/
├── app/
│   └── sites/          # main, app, link, live, queue
├── components/
│   ├── landing/        # komponen situs publik
│   ├── admin/          # komponen panel admin
│   └── ui/             # modal, kalender, dan elemen bersama
├── lib/                # data publik, domain, utilitas, model
└── proxy.js            # routing berdasarkan host dan gerbang login
supabase/               # skema, migrasi, dan RPC
```

## Konfigurasi

Variabel lingkungan yang dibutuhkan:

| Variabel                        | Keterangan                        |
| ------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL proyek Supabase               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci `anon` Supabase             |
| `NEXT_PUBLIC_ROOT_DOMAIN`       | Domain induk, mis. `memoribox.id` |

Kunci `service_role` tidak pernah disimpan di klien maupun repository.

---

<div align="center">

**MemoriBox.id** · Photobooth & Photobox · Jabodetabek & Bali

</div>
