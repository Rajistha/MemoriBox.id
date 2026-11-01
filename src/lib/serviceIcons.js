import {
  FiCamera, FiPrinter, FiSmartphone, FiUsers, FiLayout, FiClock, FiStar, FiImage, FiGift, FiHeart, FiMusic, FiZap,
} from 'react-icons/fi';

// Pilihan ikon untuk kartu layanan (dipilih dari menu Profil di admin).
export const SERVICE_ICONS = {
  camera: { label: 'Kamera', Icon: FiCamera },
  printer: { label: 'Printer', Icon: FiPrinter },
  phone: { label: 'Ponsel', Icon: FiSmartphone },
  users: { label: 'Orang', Icon: FiUsers },
  layout: { label: 'Frame', Icon: FiLayout },
  clock: { label: 'Waktu', Icon: FiClock },
  star: { label: 'Bintang', Icon: FiStar },
  image: { label: 'Foto', Icon: FiImage },
  gift: { label: 'Hadiah', Icon: FiGift },
  heart: { label: 'Hati', Icon: FiHeart },
  music: { label: 'Musik', Icon: FiMusic },
  zap: { label: 'Kilat', Icon: FiZap },
};

export const iconFor = (key) => (SERVICE_ICONS[key] || SERVICE_ICONS.star).Icon;
