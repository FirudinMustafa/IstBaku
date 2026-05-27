'use client';

import * as React from 'react';
import {
  Scale, FileCheck2, Coins, Globe2, ArrowRight, ArrowLeft, BookOpen, CheckCircle2, Download,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/layout/LangProvider';
import type { Lang } from '@/lib/types';

type Nationality = 'TR' | 'AZ' | 'OTHER';
type Country = 'TR' | 'AZ';
type Purpose = 'oturum' | 'yatirim' | 'isyeri';

interface Step { titleKey?: string; title?: string; descKey?: string; desc?: string; icon: typeof FileCheck2 }
type GuideKey = `${Nationality}-${Country}`;

// Per-language step content. Built as a 3-way map so each route renders in
// the user's chosen lang without falling back to TR for foreign buyers.
// Partial: yeni eklenen diller (ru/de/zh) için TR fallback'i kullanılır.
const STEPS: Partial<Record<Lang, Record<GuideKey, { title: string; desc: string; i: typeof FileCheck2 }[]>>> = {
  tr: {
    'TR-TR': [
      { title: 'Vergi numarası al', desc: 'TR vatandaşı için TC kimlik = vergi no, ek işlem yok.', i: FileCheck2 },
      { title: 'Tapuda alım sözleşmesi', desc: 'Noter şartı yok, ancak hukuki danışman önerilir.', i: Scale },
      { title: 'Tapu harcı + DASK', desc: '%4 tapu harcı (alıcı+satıcı paylaşımı pazarlık).', i: Coins },
      { title: 'Aboneliklerin devri', desc: 'Su, elektrik, doğalgaz devir işlemleri.', i: CheckCircle2 },
    ],
    'TR-AZ': [
      { title: 'AZ Vergi numarası (VOEN) al', desc: 'Pasaport ile vergi dairesinden 30 dk.', i: FileCheck2 },
      { title: 'AZ banka hesabı aç', desc: 'Yabancı için Kapital Bank, ABB, PASHA önerilir.', i: Coins },
      { title: 'Notarial alım-satım sözleşmesi', desc: 'Azerbaycan\'da emlak alımı notar şartı vardır.', i: Scale },
      { title: 'ASAN Xidmət\'te tapu tescili', desc: '%0.1 dövlət rüsumu + 30 manat hizmet bedeli.', i: FileCheck2 },
      { title: 'MIDA üzerinden yabancı bildirimi', desc: 'Türk vatandaşı kolaylığı: özel rejim.', i: Globe2 },
      { title: 'Oturum izni (opsiyonel)', desc: '$100K+ alımda 1 yıllık oturum izni başvurusu.', i: BookOpen },
    ],
    'AZ-TR': [
      { title: 'Türkiye Vergi Kimlik Numarası', desc: 'Pasaport ile en yakın vergi dairesinden.', i: FileCheck2 },
      { title: 'TR banka hesabı + DASK', desc: 'Zorunlu deprem sigortası.', i: Coins },
      { title: 'Tapu Müdürlüğü randevusu', desc: 'WebTapu veya 181 üzerinden randevu.', i: Scale },
      { title: '$400K+ alımda vatandaşlık seçeneği', desc: 'Türk vatandaşlık programı (CBI).', i: Globe2 },
      { title: 'Tapu harcı ve döner sermaye', desc: '%4 tapu harcı + döner sermaye ücreti.', i: Coins },
    ],
    'AZ-AZ': [
      { title: 'VOEN doğrulama', desc: 'AZ vatandaşı için kimlik kafidir.', i: FileCheck2 },
      { title: 'Notar sözleşmesi', desc: 'Mecburi notarial onay.', i: Scale },
      { title: 'ASAN Xidmət tescili', desc: 'Devlet rüsumu ödenir, e-imza ile hızlandırılır.', i: FileCheck2 },
    ],
    'OTHER-TR': [
      { title: 'Vergi kimlik numarası al', desc: 'Pasaport + adres beyanı ile vergi dairesinden vergi numarası alınır. Yabancı alıcı için zorunludur.', i: FileCheck2 },
      { title: 'Askeri/güvenlik bölgesi kontrolü', desc: 'Tapu Müdürlüğü, bölgenin yabancı alımına açık olup olmadığını teyit eder. Çoğu il sorunsuzdur.', i: Globe2 },
      { title: 'Ekspertiz raporu (zorunlu)', desc: 'Lisanslı eksper, taşınmazın gerçek piyasa değerini raporlar — son 3 ayda geçerlidir.', i: BookOpen },
      { title: 'TR banka hesabı + DASK', desc: 'Yabancılar için TR bankalarında hesap açılışı + zorunlu deprem sigortası.', i: Coins },
      { title: 'Tapu Müdürlüğü randevusu', desc: 'WebTapu üzerinden randevu, devir sırasında yeminli tercüman bulunur.', i: Scale },
      { title: 'Vatandaşlık seçeneği', desc: '$400K+ alım + 3 yıl satmama taahhüdü Türk vatandaşlığı doğurur.', i: Globe2 },
    ],
    'OTHER-AZ': [
      { title: 'VOEN al', desc: 'Pasaport ile vergi dairesinden VOEN alınır.', i: FileCheck2 },
      { title: 'Notarial sözleşme', desc: 'AZ\'de emlak alımı zorunlu noter onayı gerektirir.', i: Scale },
      { title: 'AZ banka hesabı', desc: 'Ödeme banka transferiyle yapılır.', i: Coins },
      { title: 'ASAN Xidmət tapu tescili', desc: '%0.1 devlet rüsumu + hizmet bedeli.', i: FileCheck2 },
      { title: 'Oturum izni (opsiyonel)', desc: '$100K+ alımda 1 yıllık oturum başvurusu yapılabilir.', i: BookOpen },
    ],
  },
  az: {
    'TR-TR': [
      { title: 'Vergi nömrəsi al', desc: 'TC kimliyi vergi nömrəsi yerinə keçir.', i: FileCheck2 },
      { title: 'Alış-veriş müqaviləsi', desc: 'Notarius məcburi deyil, lakin tövsiyə olunur.', i: Scale },
      { title: 'Tapu rüsumu + DASK', desc: '4% tapu rüsumu, alıcı/satıcı arasında bölünə bilər.', i: Coins },
      { title: 'Komunal abunəliklərin köçürülməsi', desc: 'Su, elektrik, qaz.', i: CheckCircle2 },
    ],
    'TR-AZ': [
      { title: 'VOEN al (vergi nömrəsi)', desc: 'Pasportla vergi idarəsindən 30 dəq.', i: FileCheck2 },
      { title: 'AZ bank hesabı', desc: 'Xaricilər üçün Kapital Bank, ABB, PASHA.', i: Coins },
      { title: 'Notarial alış-veriş müqaviləsi', desc: 'Azərbaycanda notarial təsdiq vacibdir.', i: Scale },
      { title: 'ASAN Xidmətdə tapu', desc: '0.1% dövlət rüsumu + 30 AZN xidmət.', i: FileCheck2 },
      { title: 'MIDA xarici bildirişi', desc: 'Türk vətəndaşları üçün xüsusi rejim.', i: Globe2 },
      { title: 'Yaşayış icazəsi (istəyə bağlı)', desc: '$100K+ alış üçün 1 illik yaşayış icazəsi.', i: BookOpen },
    ],
    'AZ-TR': [
      { title: 'Türkiyə vergi nömrəsi', desc: 'Pasportla yaxın vergi idarəsindən.', i: FileCheck2 },
      { title: 'TR bank hesabı + DASK', desc: 'Məcburi zəlzələ sığortası.', i: Coins },
      { title: 'Tapu randevusu', desc: 'WebTapu vəya 181 üzərindən.', i: Scale },
      { title: '$400K+ alış → Türk vətəndaşlığı', desc: 'CBI proqramı vasitəsilə.', i: Globe2 },
      { title: 'Tapu rüsumu', desc: '4% + əlavə xidmət haqqı.', i: Coins },
    ],
    'AZ-AZ': [
      { title: 'VOEN təsdiqi', desc: 'Şəxsiyyət vəsiqəsi kifayət edir.', i: FileCheck2 },
      { title: 'Notarial müqavilə', desc: 'Mütləq notarial təsdiq.', i: Scale },
      { title: 'ASAN Xidmət', desc: 'Dövlət rüsumu, e-imza ilə sürətli.', i: FileCheck2 },
    ],
    'OTHER-TR': [
      { title: 'Vergi nömrəsi al', desc: 'Pasport və ünvan bildirişi ilə vergi idarəsindən. Xarici alıcı üçün məcburidir.', i: FileCheck2 },
      { title: 'Hərbi bölgə yoxlaması', desc: 'Tapu Müdürlüyü bölgənin xaricilərə açıq olub-olmadığını yoxlayır.', i: Globe2 },
      { title: 'Ekspertiza hesabatı (məcburi)', desc: 'Lisenziyalı ekspert əmlakın bazar dəyərini təsdiqləyir — 3 ay etibarlıdır.', i: BookOpen },
      { title: 'TR bank hesabı + DASK', desc: 'Bank hesabı + məcburi zəlzələ sığortası.', i: Coins },
      { title: 'Tapu randevusu', desc: 'WebTapu üzərindən randevu, andlı tərcüməçi tələb olunur.', i: Scale },
      { title: 'Vətəndaşlıq seçimi', desc: '$400K+ alış + 3 il satmamaq öhdəliyi vətəndaşlıq verir.', i: Globe2 },
    ],
    'OTHER-AZ': [
      { title: 'VOEN al', desc: 'Pasportla vergi idarəsindən.', i: FileCheck2 },
      { title: 'Notarial müqavilə', desc: 'Azərbaycanda notarial təsdiq vacibdir.', i: Scale },
      { title: 'AZ bank hesabı', desc: 'Ödəmə bank köçürməsi ilə.', i: Coins },
      { title: 'ASAN Xidmət', desc: '0.1% dövlət rüsumu + xidmət haqqı.', i: FileCheck2 },
      { title: 'Yaşayış icazəsi (istəyə bağlı)', desc: '$100K+ alış üçün 1 illik yaşayış icazəsi.', i: BookOpen },
    ],
  },
  en: {
    'TR-TR': [
      { title: 'Get a tax number', desc: 'For Turkish citizens the national ID doubles as the tax number — no extra step.', i: FileCheck2 },
      { title: 'Title deed contract', desc: 'A notary is not mandatory, but a legal advisor is recommended.', i: Scale },
      { title: 'Title deed fee + DASK', desc: '4% transfer fee (buyer/seller split is negotiable) plus mandatory earthquake insurance.', i: Coins },
      { title: 'Utility transfers', desc: 'Water, electricity, gas — moved to the buyer.', i: CheckCircle2 },
    ],
    'TR-AZ': [
      { title: 'Get an AZ tax number (VOEN)', desc: 'About 30 minutes at the tax office with a passport.', i: FileCheck2 },
      { title: 'Open an AZ bank account', desc: 'Kapital Bank, ABB, PASHA are friendly to foreigners.', i: Coins },
      { title: 'Notarised purchase contract', desc: 'AZ requires a notary for property transactions.', i: Scale },
      { title: 'Title deed at ASAN Xidmət', desc: '0.1% state fee + 30 AZN service charge.', i: FileCheck2 },
      { title: 'MIDA foreign-buyer notice', desc: 'Special regime simplifies the process for Turkish citizens.', i: Globe2 },
      { title: 'Residency permit (optional)', desc: '$100K+ purchase qualifies for a 1-year residency permit.', i: BookOpen },
    ],
    'AZ-TR': [
      { title: 'Turkish Tax ID', desc: 'Apply with your passport at the nearest tax office.', i: FileCheck2 },
      { title: 'TR bank account + DASK', desc: 'Mandatory earthquake insurance.', i: Coins },
      { title: 'Title deed appointment', desc: 'Book via WebTapu or 181.', i: Scale },
      { title: '$400K+ purchase = citizenship route', desc: 'Turkish Citizenship by Investment (CBI).', i: Globe2 },
      { title: 'Title fee', desc: '4% transfer fee + service charge.', i: Coins },
    ],
    'AZ-AZ': [
      { title: 'VOEN verification', desc: 'National ID is sufficient.', i: FileCheck2 },
      { title: 'Notary contract', desc: 'Mandatory notarial approval.', i: Scale },
      { title: 'Title at ASAN Xidmət', desc: 'State fee; e-signature speeds it up.', i: FileCheck2 },
    ],
    'OTHER-TR': [
      { title: 'Foreign buyer in Turkey — Tax ID', desc: 'Foreign buyer must obtain a Turkish tax ID at the tax office (passport + address declaration).', i: FileCheck2 },
      { title: 'Restricted-zone check', desc: 'The Land Registry confirms the property is not in a military/security zone closed to foreigners. Most provinces are open.', i: Globe2 },
      { title: 'Valuation report (mandatory)', desc: 'A licensed appraiser issues an SPK-approved valuation valid for 3 months.', i: BookOpen },
      { title: 'TR bank account + DASK', desc: 'Open a Turkish bank account and buy the mandatory earthquake insurance.', i: Coins },
      { title: 'Title deed appointment', desc: 'Book via WebTapu; a sworn translator must attend the signing.', i: Scale },
      { title: 'Citizenship route', desc: 'A $400K+ purchase with a 3-year no-sale commitment unlocks Turkish citizenship.', i: Globe2 },
    ],
    'OTHER-AZ': [
      { title: 'Get a VOEN', desc: 'Tax number at the local tax office with your passport.', i: FileCheck2 },
      { title: 'Notarised contract', desc: 'AZ requires a notary for property transactions.', i: Scale },
      { title: 'AZ bank account', desc: 'Payments must clear via a bank transfer.', i: Coins },
      { title: 'ASAN Xidmət registration', desc: '0.1% state fee + service charge.', i: FileCheck2 },
      { title: 'Residency permit (optional)', desc: '$100K+ purchase qualifies for a 1-year residency permit.', i: BookOpen },
    ],
  },
};

// PB-06 — PDF library. Renders a list with links to the existing
// `/api/country-guide?iso=...` endpoint that already serves a placeholder PDF.
interface LegalPdf { title: string; slug: string; lang: Lang; iso: string }
const LEGAL_PDFS: LegalPdf[] = [
  { title: 'Türkiye Ev Alım Rehberi (TR)',         slug: 'tr-tr-guide', lang: 'tr', iso: 'TR' },
  { title: 'Azərbaycan Ev Alım Rehberi (TR)',      slug: 'tr-az-guide', lang: 'tr', iso: 'AZ' },
  { title: 'Türkiyədə Ev Alış Bələdçisi (AZ)',     slug: 'az-tr-guide', lang: 'az', iso: 'TR' },
  { title: 'Azərbaycanda Ev Alış Bələdçisi (AZ)',  slug: 'az-az-guide', lang: 'az', iso: 'AZ' },
  { title: 'Foreign Buyer Guide — Turkey (EN)',    slug: 'en-tr-guide', lang: 'en', iso: 'TR' },
  { title: 'Foreign Buyer Guide — Azerbaijan (EN)', slug: 'en-az-guide', lang: 'en', iso: 'AZ' },
];

export default function LegalGuidePage() {
  const { lang, t } = useLang();
  // Vatandaşlık sorulmuyor — yatırım hedefine göre rehber üretiyoruz; en evrensel (OTHER) varyantı seç.
  const nationality: Nationality = 'OTHER';
  const [country, setCountry] = React.useState<Country>('TR');
  const [purpose, setPurpose] = React.useState<Purpose>('yatirim');
  const [step, setStep] = React.useState(0);

  const key: GuideKey = `${nationality}-${country}`;
  const trSteps = STEPS.tr!;
  const guide = STEPS[lang]?.[key] ?? trSteps[key] ?? trSteps['TR-AZ'];
  void purpose;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="navy"><Scale size={11} /> {t('legal.badge')}</Badge>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{t('legal.heading')}</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">{t('legal.lead')}</p>
      </div>

      <Card className="mt-8">
        <CardBody>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase text-[color:var(--fg-muted)] mb-1.5">{t('legal.target')}</div>
              <Select value={country} onChange={(e) => { setCountry(e.target.value as Country); setStep(0); }}>
                <option value="TR">{t('legal.country.TR')}</option>
                <option value="AZ">{t('legal.country.AZ')}</option>
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[color:var(--fg-muted)] mb-1.5">{t('legal.purpose')}</div>
              <Select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                <option value="oturum">{t('legal.purpose.oturum')}</option>
                <option value="yatirim">{t('legal.purpose.yatirim')}</option>
                <option value="isyeri">{t('legal.purpose.isyeri')}</option>
              </Select>
            </div>
          </div>
          {nationality === 'OTHER' && country === 'TR' && (
            <p className="mt-4 text-xs text-gold-300">
              {t('legal.foreignBuyer')}
            </p>
          )}
        </CardBody>
      </Card>

      <div className="mt-8 grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-2">
          {guide.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                step === i ? 'bg-gold-400/15 border-gold-400/40 text-gold-300' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-card-hover)]',
              )}
            >
              <span className={cn(
                'size-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0',
                step === i ? 'bg-gold-400 border-gold-400 text-navy-900' : 'border-[color:var(--border-strong)]',
              )}>{i + 1}</span>
              <span className="text-sm font-medium">{s.title}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardBody className="p-7">
            <Badge variant="gold">{t('legal.step')} {step + 1} / {guide.length}</Badge>
            <h2 className="mt-3 text-2xl font-bold">{guide[step].title}</h2>
            <p className="mt-2 text-[color:var(--fg-muted)] text-pretty">{guide[step].desc}</p>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <Card className="bg-[color:var(--bg-elev)]"><CardBody className="p-4">
                <FileCheck2 size={16} className="text-gold-300" />
                <div className="text-xs font-semibold mt-2">{t('legal.required')}</div>
                <ul className="mt-2 text-xs text-[color:var(--fg-muted)] space-y-1">
                  <li>• {lang === 'en' ? 'Passport' : lang === 'az' ? 'Pasport' : 'Pasaport'}</li>
                  <li>• {lang === 'en' ? 'Address declaration' : lang === 'az' ? 'Ünvan bildirişi' : 'Adres beyanı'}</li>
                  <li>• {lang === 'en' ? '2× photos' : lang === 'az' ? '2× foto' : '2x foto'}</li>
                </ul>
              </CardBody></Card>
              <Card className="bg-[color:var(--bg-elev)]"><CardBody className="p-4">
                <Coins size={16} className="text-gold-300" />
                <div className="text-xs font-semibold mt-2">{t('legal.estCost')}</div>
                <div className="mt-2 text-lg font-bold text-gold-300">$30 – $80</div>
              </CardBody></Card>
              <Card className="bg-[color:var(--bg-elev)]"><CardBody className="p-4">
                <BookOpen size={16} className="text-gold-300" />
                <div className="text-xs font-semibold mt-2">{t('legal.estTime')}</div>
                <div className="mt-2 text-lg font-bold">30 {lang === 'en' ? 'min – 1 day' : lang === 'az' ? 'dəq – 1 gün' : 'dk – 1 gün'}</div>
              </CardBody></Card>
            </div>

            <div className="mt-7 rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <Scale size={16} className="text-gold-300 mt-0.5" />
                <div>
                  <strong>{t('legal.partner')}</strong>
                  <p className="text-[color:var(--fg-muted)] mt-1 text-xs">{t('legal.partnerSubtitle')}</p>
                </div>
              </div>
              <Button variant="gold" size="sm" className="mt-3">{t('legal.matchLawyer')}</Button>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={14} /> {t('legal.previous')}</Button>
              <Button variant="gold" disabled={step === guide.length - 1} onClick={() => setStep((s) => s + 1)}>{t('legal.next')} <ArrowRight size={14} /></Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* PDF library (PB-06) ------------------------------------------------ */}
      <section id="pdf" className="mt-12">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight inline-flex items-center gap-2">
          <BookOpen size={18} className="text-gold-300" /> {t('legal.pdfTitle')}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{t('legal.pdfSubtitle')}</p>

        <ul className="mt-5 grid sm:grid-cols-2 gap-3" data-testid="legal-pdf-list">
          {LEGAL_PDFS.map((pdf) => (
            <li key={pdf.slug}>
              <a
                href={`/api/country-guide?iso=${pdf.iso}&lang=${pdf.lang}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elev)] hover:border-gold-400/60 hover:text-gold-300 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Download size={16} className="text-gold-300 shrink-0" />
                  <span className="text-sm font-medium truncate">{pdf.title}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[color:var(--fg-muted)] shrink-0">PDF · {pdf.lang.toUpperCase()}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
