import type { NextConfig } from 'next';

// MH-21: Security headers
// CSP starts permissive enough to keep Tailwind + the existing inline theme
// bootstrap working; tighten to nonce-based once that's wired in.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: false, // dev'de Leaflet'in çift mount'ta `_leaflet_pos` hatası vermemesi için
  experimental: {
    serverActions: {
      // MH-17 — body size lowered from 100mb to 5mb. Large uploads
      // (photos / videos) must go direct-to-Blob with scoped tokens
      // instead of being piped through server actions.
      bodySizeLimit: '5mb',
    },
  },
  images: {
    // MC-23 / MH-18 — modern formats first.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Production: Vercel Blob
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.blob.vercel-storage.com' },
      // Dev placeholders — keep for now (D-team can remove pre-launch)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
