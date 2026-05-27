'use client';

import Link from 'next/link';
import { Logo } from './Logo';
import { useLang } from './LangProvider';

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t mt-16 sm:mt-24 bg-[color:var(--bg-elev)]" role="contentinfo">
      <div className="w-full px-4 py-8 sm:py-12 grid gap-8 sm:gap-10 grid-cols-2 md:grid-cols-5">
        <div className="col-span-2 md:col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-[color:var(--fg-muted)] max-w-sm">{t('footer.tagline')}</p>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/coming-soon?topic=Instagram" className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300">
              Instagram
            </Link>
            <Link href="/coming-soon?topic=LinkedIn" className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300">
              LinkedIn
            </Link>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-faint)] mb-3">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings" className="hover:text-gold-300">İlanlar</Link></li>
            <li><Link href="/ai-match" className="hover:text-gold-300">AI Eşleşme</Link></li>
            <li><Link href="/private-portfolio" className="hover:text-gold-300">Gizli Portföy</Link></li>
            <li><Link href="/new-listing" className="hover:text-gold-300">İlan Ver</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-faint)] mb-3">Yatırımcı</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/reports" className="hover:text-gold-300">Raporlar</Link></li>
            <li><Link href="/legal-guide" className="hover:text-gold-300">Hukuki Rehber</Link></li>
            <li><Link href="/blog" className="hover:text-gold-300">Blog</Link></li>
            <li><Link href="/dashboard" className="hover:text-gold-300">Panelim</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-faint)] mb-3">Şirket</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/coming-soon?topic=Hakk%C4%B1m%C4%B1zda" className="hover:text-gold-300">Hakkımızda</Link></li>
            <li><Link href="/coming-soon?topic=Kariyer" className="hover:text-gold-300">Kariyer</Link></li>
            <li><Link href="/coming-soon?topic=%C4%B0leti%C5%9Fim" className="hover:text-gold-300">İletişim</Link></li>
            <li><Link href="/legal-guide#kvkk" className="hover:text-gold-300">KVKK / GDPR</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="w-full px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[color:var(--fg-muted)]">
          <div>© {new Date().getFullYear()} ISTBAKU. Tüm hakları saklıdır.</div>
          <div className="flex items-center gap-4">
            <Link href="/legal-guide#privacy" className="hover:text-gold-300">Gizlilik</Link>
            <Link href="/legal-guide#terms" className="hover:text-gold-300">Kullanım Şartları</Link>
            <Link href="/coming-soon?topic=%C3%87erezler" className="hover:text-gold-300">Çerezler</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
