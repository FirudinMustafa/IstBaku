'use client';

import * as React from 'react';
import { TrendingUp, MapPin, Users, Globe, Download, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Legend,
} from 'recharts';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select, Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { REGIONS } from '@/lib/data/regions';
import { useLang } from '@/components/layout/LangProvider';
import { submitDemoRequestAction } from '@/lib/report-actions';

const TREND = [
  { m: 'Eki', tr: 100, az: 100 },
  { m: 'Kas', tr: 104, az: 103 },
  { m: 'Ara', tr: 107, az: 105 },
  { m: 'Oca', tr: 109, az: 108 },
  { m: 'Şub', tr: 112, az: 110 },
  { m: 'Mar', tr: 116, az: 113 },
  { m: 'Nis', tr: 120, az: 117 },
  { m: 'May', tr: 124, az: 121 },
];

const FOREIGN = [
  { country: 'Rusya', value: 28 },
  { country: 'İran', value: 22 },
  { country: 'Almanya', value: 16 },
  { country: 'BAE', value: 14 },
  { country: 'Türkiye→AZ', value: 12 },
  { country: 'Diğer', value: 8 },
];

const PROFILE = [
  { seg: 'Genç çift', value: 32 },
  { seg: 'Aile (çocuklu)', value: 28 },
  { seg: 'Tek/Roommate', value: 18 },
  { seg: 'Yatırımcı', value: 14 },
  { seg: '55+', value: 8 },
];

export default function ReportsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const [country, setCountry] = React.useState<'all' | 'TR' | 'AZ'>('all');
  const [city, setCity] = React.useState<string>('all'); // Tur6 #4f: rapor şehri
  // B2B demo talep modalı (Tur6 #1d)
  const [demoOpen, setDemoOpen] = React.useState(false);
  const [demo, setDemo] = React.useState({ name: '', email: '', company: '', message: '' });
  const [demoBusy, setDemoBusy] = React.useState(false);

  async function sendDemo() {
    setDemoBusy(true);
    const res = await submitDemoRequestAction(demo);
    setDemoBusy(false);
    if (res.ok) {
      setDemoOpen(false);
      setDemo({ name: '', email: '', company: '', message: '' });
      toast({ variant: 'success', title: t('reports.demo.sent'), description: t('reports.demo.sentDesc') });
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }
  // Seçili ülkedeki şehirler (şehir seçici için)
  const cities = React.useMemo(() => {
    const set = new Set(REGIONS.filter((r) => country === 'all' || r.country === country).map((r) => r.city));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [country]);
  // Ülke değişince şehir seçimini sıfırla
  React.useEffect(() => { setCity('all'); }, [country]);

  const regions = REGIONS
    .filter((r) => (country === 'all' || r.country === country) && (city === 'all' || r.city === city))
    .sort((a, b) => b.demandIndex - a.demandIndex)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <Badge variant="ai"><Sparkles size={11} /> {t('reports.badge')}</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{t('reports.pageTitle')}</h1>
          <p className="mt-2 text-[color:var(--fg-muted)] max-w-2xl">
            {t('reports.pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={country} onChange={(e) => setCountry(e.target.value as typeof country)} className="flex-1 min-w-[130px] sm:flex-none sm:w-40">
            <option value="all">{t('reports.allCountries')}</option>
            <option value="TR">🇹🇷 {t('portfolio.country.tr')}</option>
            <option value="AZ">🇦🇿 {t('portfolio.country.az')}</option>
          </Select>
          <Select value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 min-w-[130px] sm:flex-none sm:w-40">
            <option value="all">{t('reports.allCities')}</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Button variant="gold" size="md" onClick={() => window.print()} className="shrink-0"><Download size={14} /> {t('reports.pdf')}</Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: t('reports.stat.investors'), v: '8,420', d: '+%12.6 YoY', i: Users },
          { l: t('reports.stat.foreign'), v: '%34', d: '+5.4 puan', i: Globe },
          { l: t('reports.stat.trend'), v: '+%17.3', d: t('reports.stat.positive'), i: TrendingUp },
          { l: t('reports.stat.topRegion'), v: 'Səbail', d: 'Demand 94', i: MapPin },
        ].map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <s.i size={16} className="text-gold-300" />
            <div className="text-xs text-[color:var(--fg-muted)] mt-2">{s.l}</div>
            <div className="text-2xl font-bold mt-0.5">{s.v}</div>
            <div className="text-[10px] text-success mt-1">{s.d}</div>
          </CardBody></Card>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold mb-4">{t('reports.chart.priceIndex')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND}>
                  <defs>
                    <linearGradient id="grad-tr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#CAAE99" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#CAAE99" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-az" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="m" stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" name="🇹🇷 TR" dataKey="tr" stroke="#CAAE99" fill="url(#grad-tr)" strokeWidth={2} />
                  <Area type="monotone" name="🇦🇿 AZ" dataKey="az" stroke="#6366f1" fill="url(#grad-az)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold mb-4">{t('reports.chart.foreign')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FOREIGN} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis type="category" dataKey="country" stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#CAAE99" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold mb-4">{t('reports.chart.demand')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regions}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="district" stroke="var(--fg-muted)" fontSize={10} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="demandIndex" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold mb-4">{t('reports.chart.profile')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PROFILE}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="seg" stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#CAAE99" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-[color:var(--fg-muted)] mt-3">{t('reports.chart.profileNote')}</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-10 rounded-3xl border border-gold-400/30 bg-gradient-to-br from-navy-700 to-navy-900 p-8 text-white">
        <div className="flex items-center gap-2 text-gold-300 text-xs font-semibold uppercase tracking-wider"><Sparkles size={12} /> {t('reports.b2b.badge')}</div>
        <h3 className="mt-3 text-2xl font-bold">{t('reports.b2b.title')}</h3>
        <p className="mt-2 text-navy-200 max-w-2xl">{t('reports.b2b.body')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="gold" onClick={() => setDemoOpen(true)}>{t('reports.b2b.demo')}</Button>
          <Button variant="outline" className="bg-white/5 text-white border-white/20" onClick={() => window.print()}>{t('reports.b2b.sample')}</Button>
        </div>
      </div>

      <Modal open={demoOpen} onClose={() => setDemoOpen(false)} title={t('reports.demo.title')}>
        <div className="space-y-3">
          <Input label={t('reports.demo.name')} value={demo.name} onChange={(e) => setDemo((d) => ({ ...d, name: e.target.value }))} />
          <Input label={t('reports.demo.email')} type="email" value={demo.email} onChange={(e) => setDemo((d) => ({ ...d, email: e.target.value }))} />
          <Input label={t('reports.demo.company')} value={demo.company} onChange={(e) => setDemo((d) => ({ ...d, company: e.target.value }))} />
          <Textarea label={t('reports.demo.message')} rows={3} value={demo.message} onChange={(e) => setDemo((d) => ({ ...d, message: e.target.value }))} />
          <Button variant="gold" className="w-full" onClick={sendDemo} loading={demoBusy}>{t('reports.demo.send')}</Button>
        </div>
      </Modal>
    </div>
  );
}
