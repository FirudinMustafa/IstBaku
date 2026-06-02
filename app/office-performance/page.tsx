import Link from 'next/link';
import { Crown, ShieldCheck, Lock } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getMyOfficeMetrics } from '@/lib/office-actions';
import { OFFICE_CRITERIA, TIER_LABEL } from '@/lib/office-metrics';

export const dynamic = 'force-dynamic';

// Ofisin KENDİ performans/rütbe durumu (müşteriye kapalı, sadece ofis + admin görür).
export default async function OfficePerformancePage() {
  const m = await getMyOfficeMetrics();

  if (!m) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock size={28} className="mx-auto text-[color:var(--fg-muted)]" />
        <h1 className="mt-4 text-xl font-bold">Ofis performansı</h1>
        <p className="mt-2 text-[color:var(--fg-muted)]">Bu sayfa yalnızca ofis/emlakçı hesaplarına açıktır.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-gold-300 hover:text-gold-400">← Panele dön</Link>
      </div>
    );
  }

  const met = new Set(m.criteriaMet);
  const tierBadge = m.tier === 'gold_partner'
    ? <Badge variant="gold"><Crown size={12} /> {TIER_LABEL.gold_partner}</Badge>
    : m.tier === 'premium_office'
      ? <Badge variant="success"><ShieldCheck size={12} /> {TIER_LABEL.premium_office}</Badge>
      : <Badge variant="outline">{TIER_LABEL.none}</Badge>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ofis Performansım</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            İlk 8 kriter → Premium Office · 12 kriter → Gold Partner. (Yalnızca sana ve yönetime görünür.)
          </p>
        </div>
        {tierBadge}
      </div>

      <Card><CardBody className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[color:var(--fg-muted)]">Karşılanan kriter</span>
          <span className="font-bold text-lg tabular-nums">{m.criteriaMet.length}/12</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[color:var(--bg-card-hover)] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold-400 to-gold-300" style={{ width: `${(m.criteriaMet.length / 12) * 100}%` }} />
        </div>
      </CardBody></Card>

      <Card><CardBody className="p-5">
        <h2 className="font-semibold mb-3">Kriterler</h2>
        <ul className="space-y-2">
          {OFFICE_CRITERIA.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className={met.has(c.id) ? 'text-success' : 'text-[color:var(--fg-faint)]'}>{met.has(c.id) ? '✓' : '○'}</span>
              <span>{c.id}. {c.label}</span>
              {c.id === 8 && <span className="ml-auto text-[10px] text-[color:var(--fg-faint)]">↑ Premium Office</span>}
              {c.id === 12 && <span className="ml-auto text-[10px] text-[color:var(--fg-faint)]">↑ Gold Partner</span>}
            </li>
          ))}
        </ul>
      </CardBody></Card>

      <p className="text-[11px] text-[color:var(--fg-faint)]">
        Metrikler aylık güncellenir. "Satış/kira ile kapanma" kriteri için veri henüz toplanmamaktadır.
      </p>
    </div>
  );
}
