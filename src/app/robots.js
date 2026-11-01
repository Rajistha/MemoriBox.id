import { siteUrl } from '@/lib/domains';

export default function robots() {
  return {
    rules: [
      {
        // Halaman publik boleh diindeks
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl('')}/sitemap.xml`,
    host: siteUrl(''),
  };
}
