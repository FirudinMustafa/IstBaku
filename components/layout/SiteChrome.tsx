'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { ChatbotFAB } from '@/components/chat/ChatbotFAB';
import { CompareFloatingBar } from '@/components/listings/CompareFloatingBar';
import { useLang } from './LangProvider';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLang();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    // Admin'in kendi shell'i var — global header/footer/chatbot'u bastır.
    return <>{children}</>;
  }

  return (
    <>
      {/* PF-10: skip-to-main link MUST be the very first focusable element so
          keyboard users can bypass the nav (WCAG 2.4.1).
          - We render it as the first DOM node before <Header>.
          - tabIndex={0} is explicit (defensive against any future regression
            where a sibling re-orders the tab order).
          - We position it off-screen with a non-zero size (1×1 px) instead of
            the standard `clip-rect(0,0,0,0)` sr-only pattern; some Chromium
            builds skip zero-sized elements in sequential focus navigation, and
            that's what the mobile persona regression captured.
          - On focus, we restore the element to the top-left with full visible
            chrome. The label is translated through the i18n layer. */}
      <a
        href="#main"
        tabIndex={0}
        data-testid="skip-to-main"
        className="absolute left-0 top-0 z-[1000] m-2 -translate-y-[200%] focus:translate-y-0 focus:not-sr-only px-4 py-2 rounded-lg bg-gold-400 text-navy-900 font-semibold shadow-lg transition-transform"
      >
        {t('a11y.skip')}
      </a>
      <Header />
      <main id="main" className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
      <CompareFloatingBar />
      <ChatbotFAB />
      <MobileBottomNav />
    </>
  );
}
