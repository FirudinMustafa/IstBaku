'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sparkles, Home, Briefcase, Sun, TrendingUp, ArrowRight,
  ArrowLeft, Check, ShieldCheck, Building2,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Label, Select } from '@/components/ui/Input';
import { ScoreRing } from '@/components/listings/ScoreRing';
import { aiMatchAction, type AIMatchResult } from '@/lib/ai-match-action';
import { getCategoriesByCountries } from '@/lib/queries/categories';
import { formatPrice } from '@/lib/currency';
import type { UserGoal, Country, PropertyType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/layout/LangProvider';

const GOALS: { v: UserGoal; l: string; d: string; i: typeof Home }[] = [
  { v: 'oturum', l: 'Oturum', d: 'Kendim/ailem için yaşamak', i: Home },
  { v: 'kira', l: 'Kira Geliri', d: 'Düzenli pasif gelir', i: Briefcase },
  { v: 'yazlik', l: 'Yazlık', d: 'Sezonluk + Airbnb', i: Sun },
  { v: 'yatirim', l: 'Yatırım', d: 'Uzun vade değer artışı', i: TrendingUp },
];

interface AIMatchClientProps {
  availableCountries: { code: string; label: string; flag: string }[];
}

const ALL_TYPES: PropertyType[] = ['konut', 'luks_konut', 'villa', 'is_yeri', 'arsa', 'proje', 'bina', 'turistik_tesis', 'devre_mulk'];

export default function AIMatchClient({ availableCountries }: AIMatchClientProps) {
  const { t } = useLang();
  const [step, setStep] = React.useState<0 | 1 | 2 | 3 | 4>(0);
  const [goals, setGoals] = React.useState<UserGoal[]>([]);
  const [countries, setCountries] = React.useState<Country[]>(availableCountries.map((c) => c.code));
  const [availableTypes, setAvailableTypes] = React.useState<PropertyType[]>([]);
  const [selectedTypes, setSelectedTypes] = React.useState<PropertyType[]>([]);
  const [typesLoading, setTypesLoading] = React.useState(false);
  const [budget, setBudget] = React.useState(500000);
  const [horizon, setHorizon] = React.useState('5');
  const [results, setResults] = React.useState<AIMatchResult[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const toggleGoal = (g: UserGoal) =>
    setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const toggleCountry = (c: Country) =>
    setCountries((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const toggleType = (pt: PropertyType) =>
    setSelectedTypes((cur) => (cur.includes(pt) ? cur.filter((x) => x !== pt) : [...cur, pt]));

  async function loadCategories() {
    setTypesLoading(true);
    const types = await getCategoriesByCountries(countries);
    const valid = types.filter((t): t is PropertyType => ALL_TYPES.includes(t as PropertyType)) as PropertyType[];
    setAvailableTypes(valid.length > 0 ? valid : ALL_TYPES);
    setSelectedTypes(valid.length > 0 ? valid : ALL_TYPES);
    setTypesLoading(false);
    setStep(2);
  }

  async function run() {
    setLoading(true);
    const res = await aiMatchAction({
      goals,
      countries,
      propertyTypes: selectedTypes,
      maxBudgetUSD: budget,
      horizonYears: Number(horizon),
      maxResults: 5,
    });
    setResults(res);
    setLoading(false);
    setStep(4);
  }

  return (
    <div className="mx-auto max-w-4xl w-full px-2 sm:px-3 lg:px-5 py-6 md:py-10 pb-32 md:pb-12">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="ai"><Sparkles size={11} /> AI Eşleşme</Badge>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Hedefini söyle, AI seçsin.</h1>
        <p className="mt-3 text-[color:var(--fg-muted)] text-pretty">
          Bilgi yığını yerine 5 net öneri. Her ilanın neden seçildiğini açıklarız — kabul, değiştir, atla.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1.5 rounded-full transition-all', i <= step ? 'bg-gold-400 w-10' : 'bg-[color:var(--bg-card-hover)] w-5')} />
        ))}
      </div>

      <Card className="mt-6 md:mt-8">
        <CardBody className="p-5 md:p-10">
          {step === 0 && (
            <>
              <h2 className="text-xl font-semibold">1. Amacın ne? <span className="text-xs text-[color:var(--fg-muted)] font-normal ml-2">(birden fazla seçebilirsin)</span></h2>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GOALS.map((g) => {
                  const active = goals.includes(g.v);
                  return (
                    <button
                      key={g.v}
                      onClick={() => toggleGoal(g.v)}
                      className={cn(
                        'rounded-2xl border p-5 text-left transition-all',
                        active
                          ? 'border-gold-400 bg-gold-400/10'
                          : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
                      )}
                    >
                      <g.i size={22} className={active ? 'text-gold-300' : 'text-[color:var(--fg-muted)]'} />
                      <div className="mt-3 font-semibold">{g.l}</div>
                      <div className="text-xs text-[color:var(--fg-muted)] mt-1">{g.d}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-7 flex justify-end">
                <Button disabled={goals.length === 0} onClick={() => setStep(1)} variant="gold">İleri <ArrowRight size={14} /></Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold">2. Hangi ülke(ler)?</h2>
              {availableCountries.length === 0 ? (
                <p className="mt-5 text-sm text-[color:var(--fg-muted)]">
                  Henüz aktif ülke yok. İlk ilan eklendiğinde ülkeler otomatik görünecek.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableCountries.map((c) => {
                    const active = countries.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        onClick={() => toggleCountry(c.code)}
                        className={cn(
                          'rounded-2xl border p-6 text-center font-semibold transition-all',
                          active ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)]',
                        )}
                      >
                        {c.flag} {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft size={14} /> Geri</Button>
                <Button disabled={countries.length === 0} variant="gold" onClick={loadCategories} loading={typesLoading}>İleri <ArrowRight size={14} /></Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold">3. Mülk tipi <span className="text-xs text-[color:var(--fg-muted)] font-normal ml-2">(birden fazla seçebilirsin)</span></h2>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableTypes.map((pt) => {
                  const active = selectedTypes.includes(pt);
                  return (
                    <button
                      key={pt}
                      onClick={() => toggleType(pt)}
                      className={cn(
                        'rounded-2xl border p-4 text-center font-medium transition-all text-sm',
                        active ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
                      )}
                    >
                      <Building2 size={18} className={cn('mx-auto mb-2', active ? 'text-gold-300' : 'text-[color:var(--fg-muted)]')} />
                      {t(`type.${pt}`)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft size={14} /> Geri</Button>
                <Button disabled={selectedTypes.length === 0} variant="gold" onClick={() => setStep(3)}>İleri <ArrowRight size={14} /></Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold">4. Bütçe & ufuk</h2>
              <div className="mt-5 grid sm:grid-cols-2 gap-5">
                <div>
                  <Label>Maks. bütçe (USD)</Label>
                  <Input type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} />
                </div>
                <div>
                  <Label>Yatırım ufku</Label>
                  <Select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
                    <option value="1">1 yıl (kısa)</option>
                    <option value="3">3 yıl</option>
                    <option value="5">5 yıl (orta)</option>
                    <option value="10">10+ yıl (uzun)</option>
                  </Select>
                </div>
              </div>
              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft size={14} /> Geri</Button>
                <Button variant="gold" onClick={run} loading={loading}>
                  {!loading && <Sparkles size={14} />} AI Önerilerini Getir
                </Button>
              </div>
            </>
          )}

          {step === 4 && results && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold">İşte sana özel 5 ilan</h2>
                <Button variant="ghost" size="sm" onClick={() => { setStep(0); setResults(null); }}>Yeniden başlat</Button>
              </div>
              <div className="space-y-3">
                {results.map((r, idx) => {
                  const p = r.property;
                  return (
                    <Link key={p.id} href={`/property/${p.slug}`} className="block rounded-2xl border bg-[color:var(--bg-card)] hover:border-gold-400/60 transition-all overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <img src={p.images[0]} alt="" className="sm:w-48 h-40 sm:h-auto object-cover" />
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs text-gold-300 font-medium mb-1">#{idx + 1} EŞLEŞME</div>
                              <div className="font-semibold">{p.title}</div>
                              <div className="text-xs text-[color:var(--fg-muted)] mt-1">{p.city} · {p.district}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <ScoreRing value={r.fitScore} size={48} stroke={4} />
                              <div className="text-sm font-bold text-gold-300">{formatPrice(p.price, p.currency)}</div>
                            </div>
                          </div>
                          <p className="text-xs text-[color:var(--fg-muted)] mt-2 leading-relaxed">{r.reasoning}</p>
                          {r.pros.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {r.pros.map((pro) => (
                                <span key={pro} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-success/15 text-success px-2 py-0.5">
                                  <Check size={10} /> {pro}
                                </span>
                              ))}
                              {r.cons.map((con) => (
                                <span key={con} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-danger/15 text-danger px-2 py-0.5">
                                  ⚠ {con}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4 flex items-center gap-3">
                <ShieldCheck size={20} className="text-gold-300" />
                <div className="text-xs text-[color:var(--fg-muted)] flex-1">
                  Eşleşmeler ISTBAKU AI motoru tarafından, hedeflerin ve bölge talep verisi üzerinde puanlanır.
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
