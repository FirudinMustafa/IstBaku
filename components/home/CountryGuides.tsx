'use client';

import * as React from 'react';
import { Download, FileText, Globe2, BookOpen } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { CountryGuide } from '@/lib/data/country-guides';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { cn } from '@/lib/utils';

export function CountryGuides({ initial }: { initial: CountryGuide[] }) {
  const { toast } = useToast();
  const { t } = useLang();
  const guides = initial;
  const [active, setActive] = React.useState<string>(initial[0]?.iso ?? 'TR');

  const selected = guides.find((g) => g.iso === active);

  function download(g: CountryGuide) {
    window.open(g.pdfUrl, '_blank');
    toast({ variant: 'success', title: t('guides.toastTitle'), description: `${g.flag} ${g.name} — ${g.pages} ${t('guides.pagesLabel')}` });
  }

  return (
    <section className="w-full px-4 py-6 sm:py-10">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="navy"><Globe2 size={11} /> {t('guides.badge')}</Badge>
        <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          {t('guides.title')}
        </h2>
        <p className="mt-3 text-[color:var(--fg-muted)] text-pretty">
          {t('guides.sub')}
        </p>
      </div>

      <div className="mt-10 grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Ülke seçici grid */}
        <div className="grid grid-cols-3 gap-2 self-start">
          {guides.map((g) => (
            <button
              key={g.iso}
              onClick={() => setActive(g.iso)}
              className={cn(
                'rounded-2xl border p-3 text-center transition-all',
                active === g.iso
                  ? 'border-gold-400 bg-gold-400/10 text-gold-300 scale-105'
                  : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
              )}
            >
              <div className="text-3xl leading-none">{g.flag}</div>
              <div className="mt-1 text-xs font-medium">{g.name}</div>
            </button>
          ))}
        </div>

        {/* Seçili rehber detayı */}
        {selected && (
          <Card glass>
            <CardBody className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="size-16 rounded-2xl bg-gold-400/15 text-gold-300 flex items-center justify-center text-3xl">
                  {selected.flag}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold">{selected.name} — {t('guides.cardTitleSuffix')}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[color:var(--fg-muted)] flex-wrap">
                    <span className="inline-flex items-center gap-1"><FileText size={11} /> {selected.pages} {t('guides.pagesLabel')}</span>
                    <span>·</span>
                    <span>{t('guides.langLabel')}: <strong className="uppercase">{selected.language}</strong></span>
                    <span>·</span>
                    <span>{t('guides.updatedLabel')}: {new Date(selected.updatedAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm text-[color:var(--fg-muted)] leading-relaxed">{selected.description}</p>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {['guides.chip.tax', 'guides.chip.deed', 'guides.chip.visa', 'guides.chip.fx'].map((k) => (
                  <div key={k} className="rounded-lg border bg-[color:var(--bg-elev)] px-2.5 py-1.5 inline-flex items-center gap-1.5">
                    <BookOpen size={11} className="text-gold-300" /> {t(k)}
                  </div>
                ))}
              </div>

              <Button variant="gold" size="lg" className="w-full mt-6 gap-2" onClick={() => download(selected)}>
                <Download size={15} /> {t('guides.download')}
              </Button>

              <p className="mt-3 text-[10px] text-[color:var(--fg-faint)] text-center">
                {t('guides.disclaimer')}
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </section>
  );
}
