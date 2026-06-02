'use client';

import Link from 'next/link';
import { Sparkles, ShieldCheck, Brain, Lock, LineChart } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useLang } from '@/components/layout/LangProvider';

export function FeatureBento() {
  const { t } = useLang();
  return (
    <section className="relative w-full px-4 py-6 sm:py-10">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="ai" className="mb-3"><Sparkles size={11} /> {t('feature.ai.layer')}</Badge>
        <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-balance">
          {t('feature.heading.pre')} <span className="text-gold-300">{t('feature.heading.em')}</span> {t('feature.heading.post')}
        </h2>
        <p className="mt-3 text-[color:var(--fg-muted)] text-pretty">
          {t('feature.subtitle')}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Big AI Score */}
        <Link href="/listings" className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-[color:var(--bg-card)] p-7 hover:border-gold-400/60 transition-colors">
          <div className="absolute -top-20 -right-20 w-72 h-72 aurora rounded-full opacity-60 pointer-events-none" />
          <Badge variant="gold" className="mb-4"><Brain size={11} /> {t('feature.score.badge')}</Badge>
          <h3 className="text-2xl font-bold">{t('feature.score.title')}</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)] max-w-md">
            {t('feature.score.desc')}
          </p>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              { l: t('feature.score.metric.region'), v: 92 },
              { l: t('feature.score.metric.price'), v: 88 },
              { l: t('feature.score.metric.yield'), v: 82 },
              { l: t('feature.score.metric.demand'), v: 95 },
            ].map((m) => (
              <div key={m.l} className="rounded-xl border bg-[color:var(--bg-elev)] p-3">
                <div className="text-xl font-bold text-gold-300">{m.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-[color:var(--fg-muted)] mt-1">{m.l}</div>
                <div className="h-1 rounded-full bg-[color:var(--bg-card-hover)] mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-400 to-gold-300" style={{ width: `${m.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Link>

        {/* AI Match */}
        <Link href="/ai-match" className="group relative overflow-hidden rounded-3xl border bg-[color:var(--bg-card)] p-6 hover:border-gold-400/60 transition-colors">
          <Badge variant="ai" className="mb-3"><Sparkles size={11} /> {t('feature.match.badge')}</Badge>
          <h3 className="text-xl font-bold">{t('feature.match.title')}</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            {t('feature.match.desc')}
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">{t('feature.chip.living')}</span>
            <span className="rounded-full border px-2.5 py-1">{t('feature.chip.rent')}</span>
            <span className="rounded-full border px-2.5 py-1">{t('feature.chip.summer')}</span>
            <span className="rounded-full border px-2.5 py-1">{t('feature.chip.investment')}</span>
          </div>
        </Link>

        {/* Private */}
        <Link href="/private-portfolio" className="group rounded-3xl border bg-gradient-to-br from-navy-700 to-navy-900 p-6 hover:border-gold-400/60 transition-colors relative overflow-hidden">
          <Lock size={20} className="text-gold-300" />
          <h3 className="text-xl font-bold mt-4 text-white">{t('feature.private.title')}</h3>
          <p className="mt-2 text-sm text-navy-200">
            {t('feature.private.desc')}
          </p>
          <div className="mt-5 text-xs text-gold-300">{t('feature.private.cta')} →</div>
        </Link>

        {/* Multi-currency */}
        <Link href="/listings" className="group rounded-3xl border bg-[color:var(--bg-card)] p-6 hover:border-gold-400/60 transition-colors">
          <Badge variant="navy" className="mb-3">💱 {t('feature.currency.badge')}</Badge>
          <h3 className="text-xl font-bold">{t('feature.currency.title')}</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            {t('feature.currency.desc')}
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">TL</span>
            <span className="rounded-full border px-2.5 py-1">AZN</span>
            <span className="rounded-full border px-2.5 py-1">USD</span>
            <span className="rounded-full border px-2.5 py-1">EUR</span>
          </div>
        </Link>

        {/* Approved */}
        <Link href="/listings?approved=1" className="group rounded-3xl border bg-[color:var(--bg-card)] p-6 hover:border-gold-400/60 transition-colors">
          <Badge variant="success" className="mb-3"><ShieldCheck size={11} /> {t('feature.trust.badge')}</Badge>
          <h3 className="text-xl font-bold">{t('feature.approved.title')}</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            {t('feature.approved.desc')}
          </p>
        </Link>

        {/* Reports */}
        <Link href="/reports" className="group rounded-3xl border bg-[color:var(--bg-card)] p-6 hover:border-gold-400/60 transition-colors">
          <Badge variant="ai" className="mb-3"><LineChart size={11} /> {t('feature.data.badge')}</Badge>
          <h3 className="text-xl font-bold">{t('feature.reports.title')}</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            {t('feature.reports.desc')}
          </p>
        </Link>
      </div>
    </section>
  );
}
