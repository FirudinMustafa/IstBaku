'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLang } from '@/components/layout/LangProvider';

export function Hero() {
  const { t } = useLang();
  const router = useRouter();
  const [q, setQ] = React.useState('');
  return (
    <section
      className="dark relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(18,31,48,0.55) 0%, rgba(18,31,48,0.35) 45%, rgba(18,31,48,0.7) 100%), url(/hero-bg.jpg)',
        backgroundColor: '#121F30',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] aurora rounded-full opacity-30 pointer-events-none" />

      <div className="relative w-full px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
        <h1 className="font-display text-balance text-[2rem] sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
          İlan değil, <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 bg-clip-text text-transparent">
            yatırım kararı
          </span>{' '}
          sunuyoruz.
        </h1>

        <p className="mt-4 sm:mt-6 mx-auto max-w-2xl text-sm sm:text-lg text-[color:var(--fg-muted)] text-pretty">
          {t('hero.subtitle')}
        </p>

        <form
          className="mt-6 sm:mt-9 mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch gap-2 p-2 glass rounded-2xl shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(q.trim() ? `/listings?q=${encodeURIComponent(q.trim())}` : '/listings');
          }}
        >
          <div className="flex-1 flex items-center gap-2 px-3">
            <Search size={18} className="text-[color:var(--fg-muted)] shrink-0" />
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('hero.search.placeholder')}
              className="flex-1 bg-transparent border-0 outline-none h-12 text-[15px] placeholder:text-[color:var(--fg-faint)]"
            />
          </div>
          <Button type="submit" variant="gold" size="lg" className="sm:w-auto">
            {t('hero.search.button')} <ArrowRight size={16} />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[color:var(--fg-faint)]">Popüler:</span>
          {[
            { l: 'Bakı Səbail penthouse', q: 'Bakı Səbail penthouse' },
            { l: 'İstanbul Beşiktaş 3+1', q: 'Beşiktaş 3+1' },
            { l: 'Bodrum villa', q: 'Bodrum villa' },
            { l: 'Yatırımlık 200K USD altı', q: 'yatırımlık 200000 USD' },
          ].map((c) => (
            <Link key={c.l} href={`/listings?q=${encodeURIComponent(c.q)}`} className="rounded-full border px-3 py-1 hover:border-gold-400/60 hover:text-gold-300 transition-colors">
              {c.l}
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/listings">
            <Button variant="primary" size="lg">
              {t('hero.cta.primary')} <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/ai-match">
            <Button variant="outline" size="lg" className="gap-2">
              <Sparkles size={16} className="text-gold-300" /> {t('hero.cta.secondary')}
            </Button>
          </Link>
        </div>

        <div className="mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
          {[
            { v: '12,800+', l: 'Aktif İlan' },
            { v: '%17.3', l: 'YoY Trend' },
            { v: '180', l: 'Onaylı Ofis' },
            { v: 'AI', l: 'Yatırım Skoru' },
          ].map((s) => (
            <div key={s.l} className="glass rounded-2xl p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-br from-gold-300 to-gold-500 bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-[10px] sm:text-xs text-[color:var(--fg-muted)] mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
