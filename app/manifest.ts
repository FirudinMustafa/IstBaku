import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ISTBAKU — Yatırım Odaklı Emlak Platformu',
    short_name: 'ISTBAKU',
    description: 'AI destekli yatırım analiziyle emlak.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121F30',
    theme_color: '#121F30',
    icons: [
      { src: '/brand/mark-tan.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
