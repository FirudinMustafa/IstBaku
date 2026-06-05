import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Comfortaa, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { LangProvider } from '@/components/layout/LangProvider';
import { CurrencyProvider } from '@/lib/currency-store';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { ToastProvider } from '@/components/ui/Toast';
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import './globals.css';

const comfortaa = Comfortaa({ subsets: ['latin', 'latin-ext'], weight: ['400', '700'], display: 'swap', variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin', 'latin-ext'], weight: ['700', '800'], display: 'swap', variable: '--font-display' });

export const metadata: Metadata = {
  title: {
    default: 'ISTBAKU — Yatırım Odaklı Emlak Platformu',
    template: '%s · ISTBAKU',
  },
  description:
    'İlanları sadece listelemiyoruz. Yatırım odaklı, AI destekli ve ofis kalite standartlarında bir emlak deneyimi.',
  metadataBase: new URL('https://istbaku.com'),
  openGraph: {
    title: 'ISTBAKU',
    description: 'AI destekli yatırım analiziyle emlak. Tek tıkla bölgeyi, getiriyi ve riski gör.',
    url: 'https://istbaku.com',
    siteName: 'ISTBAKU',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/brand/og-default.png', width: 1200, height: 630, alt: 'ISTBAKU' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ISTBAKU',
    description: 'AI destekli yatırım analiziyle emlak. Tek tıkla bölgeyi, getiriyi ve riski gör.',
    images: ['/brand/og-default.png'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ISTBAKU',
  },
  formatDetection: { telephone: true, address: false, email: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover', // iOS notch için safe-area inset alabilmek
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#121F30' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Ülkeye göre dil (Madde 1): middleware ziyaretçinin ülkesinden `istbaku-lang`
  // cookie'sini set eder (AZ→az, TR→tr, diğer→en). SSR'ı doğru dilde başlatmak
  // için cookie'yi burada okuyup provider'a initialLang olarak geçiyoruz.
  const cookieLang = (await cookies()).get('istbaku-lang')?.value;
  const initialLang: Lang = (SUPPORTED_LANGS as readonly string[]).includes(cookieLang ?? '')
    ? (cookieLang as Lang)
    : DEFAULT_LANG;
  return (
    <html lang={initialLang} suppressHydrationWarning className={`${comfortaa.variable} ${playfair.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('istbaku-theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');var m=document.cookie.match(/(?:^|; )istbaku-lang=([^;]+)/);var l=localStorage.getItem('istbaku-lang')||(m&&m[1])||'tr';document.documentElement.setAttribute('lang',l);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LangProvider initialLang={initialLang}>
            <CurrencyProvider>
              <ToastProvider>
                <SiteChrome>{children}</SiteChrome>
              </ToastProvider>
            </CurrencyProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
