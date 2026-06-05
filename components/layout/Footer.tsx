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

          <ul className="mt-5 space-y-1.5 text-sm text-[color:var(--fg-muted)]">
            <li>
              <a href="tel:+905528142417" className="hover:text-gold-300">+90 552 814 24 17</a>
            </li>
            <li>
              <a href="tel:+994503631636" className="hover:text-gold-300">+994 50 363 16 36</a>
            </li>
            <li>
              <a href="mailto:istbaku2025@gmail.com" className="hover:text-gold-300">istbaku2025@gmail.com</a>
            </li>
          </ul>

          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://instagram.com/istbakucom"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300"
            >
              Instagram
            </a>
            <Link href="/coming-soon?topic=LinkedIn" className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300">
              LinkedIn
            </Link>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-faint)] mb-3">{t('footer.platform')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/listings" className="hover:text-gold-300">{t('footer.listings')}</Link></li>
            <li><Link href="/ai-match" className="hover:text-gold-300">{t('footer.aiMatch')}</Link></li>
            <li><Link href="/private-portfolio" className="hover:text-gold-300">{t('footer.privatePortfolio')}</Link></li>
            <li><Link href="/new-listing" className="hover:text-gold-300">{t('footer.newListing')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-faint)] mb-3">{t('footer.investor')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/reports" className="hover:text-gold-300">{t('footer.reports')}</Link></li>
            <li><Link href="/legal-guide" className="hover:text-gold-300">{t('footer.legalGuide')}</Link></li>
            <li><Link href="/blog" className="hover:text-gold-300">{t('footer.blog')}</Link></li>
            <li><Link href="/dashboard" className="hover:text-gold-300">{t('footer.dashboard')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-faint)] mb-3">{t('footer.company')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/hakkimizda" className="hover:text-gold-300">{t('footer.about')}</Link></li>
            <li><Link href="/coming-soon?topic=Kariyer" className="hover:text-gold-300">{t('footer.career')}</Link></li>
            <li><Link href="/contact" className="hover:text-gold-300">{t('footer.contact')}</Link></li>
            <li><Link href="/legal-guide#kvkk" className="hover:text-gold-300">{t('footer.kvkk')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="w-full px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[color:var(--fg-muted)]">
          <div>© {new Date().getFullYear()} ISTBAKU. {t('footer.rights')}</div>
          <div className="flex items-center gap-4">
            <Link href="/legal-guide#privacy" className="hover:text-gold-300">{t('footer.privacy')}</Link>
            <Link href="/legal-guide#terms" className="hover:text-gold-300">{t('footer.terms')}</Link>
            <Link href="/coming-soon?topic=%C3%87erezler" className="hover:text-gold-300">{t('footer.cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
