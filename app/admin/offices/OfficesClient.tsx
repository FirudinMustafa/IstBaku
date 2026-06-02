'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Crown, ShieldCheck, ChevronDown } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { recomputeOfficeMetricsAction, type OfficeMetricRow } from '@/lib/office-actions';
import { OFFICE_CRITERIA, TIER_LABEL } from '@/lib/office-metrics';

function pct(v: number) { return `%${Math.round(v * 100)}`; }

export function OfficesClient({ rows }: { rows: OfficeMetricRow[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState<string | null>(null);

  const gold = rows.filter((r) => r.tier === 'gold_partner').length;
  const premium = rows.filter((r) => r.tier === 'premium_office').length;

  async function recompute() {
    setBusy(true);
    const res = await recomputeOfficeMetricsAction();
    setBusy(false);
    if (res.ok) {
      toast({ variant: 'success', title: 'Hesaplandı', description: `${res.count} ofis güncellendi.` });
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ofis Performansı & Rütbe</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            Müşteriye kapalı içsel değerlendirme. İlk 8 kriter → Premium Office, 12 kriter → Gold Partner.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={recompute} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Yeniden hesapla
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Toplam Ofis', v: rows.length },
          { l: 'Gold Partner', v: gold },
          { l: 'Premium Office', v: premium },
          { l: 'Standart', v: rows.length - gold - premium },
        ].map((s) => (
          <Card key={s.l}><CardBody className="p-4">
            <div className="text-xs text-[color:var(--fg-muted)]">{s.l}</div>
            <div className="text-2xl font-bold mt-1 text-gold-300">{s.v}</div>
          </CardBody></Card>
        ))}
      </div>

      {rows.length === 0 && (
        <Card><CardBody className="p-6 text-center text-[color:var(--fg-muted)]">
          Henüz ofis yok veya metrik hesaplanmadı. "Yeniden hesapla" ile başlat.
        </CardBody></Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const met = new Set(r.criteriaMet);
          const expanded = open === r.agentId;
          return (
            <Card key={r.agentId}>
              <CardBody className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-[color:var(--fg-muted)]">{r.agency ?? r.email}</div>
                  </div>
                  <TierBadge tier={r.tier} />
                  <div className="text-sm font-semibold tabular-nums">{r.criteriaMet.length}/12 kriter</div>
                  <button
                    onClick={() => setOpen(expanded ? null : r.agentId)}
                    className="inline-flex items-center gap-1 text-xs text-[color:var(--fg-muted)] hover:text-gold-300"
                  >
                    Detay <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                  <Stat l="Aktif ilan" v={String(r.activeListings)} />
                  <Stat l="Video" v={pct(r.videoRatio)} />
                  <Stat l="360°" v={pct(r.tour360Ratio)} />
                  <Stat l="Şikayet" v={pct(r.complaintRatio)} />
                  <Stat l="Puan" v={r.avgReviewRating.toFixed(1)} />
                  <Stat l="Yanıt" v={`${r.avgResponseMins} dk`} />
                </div>

                {expanded && (
                  <ul className="mt-4 space-y-1.5 border-t pt-3">
                    {OFFICE_CRITERIA.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-sm">
                        <span className={met.has(c.id) ? 'text-success' : 'text-[color:var(--fg-faint)]'}>
                          {met.has(c.id) ? '✓' : '○'}
                        </span>
                        <span className={c.id <= 8 ? '' : 'text-[color:var(--fg-muted)]'}>{c.id}. {c.label}</span>
                        {c.id === 8 && <span className="ml-auto text-[10px] text-[color:var(--fg-faint)]">↑ Premium Office</span>}
                        {c.id === 12 && <span className="ml-auto text-[10px] text-[color:var(--fg-faint)]">↑ Gold Partner</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-[color:var(--fg-faint)]">
        Not: "Satış/kira ile kapanma" (kriter 12) için ilan durumu verisi henüz toplanmıyor; bu kriter şimdilik 0 sayılır.
      </p>
    </div>
  );
}

function TierBadge({ tier }: { tier: OfficeMetricRow['tier'] }) {
  if (tier === 'gold_partner') return <Badge variant="gold"><Crown size={11} /> {TIER_LABEL.gold_partner}</Badge>;
  if (tier === 'premium_office') return <Badge variant="success"><ShieldCheck size={11} /> {TIER_LABEL.premium_office}</Badge>;
  return <Badge variant="outline">{TIER_LABEL.none}</Badge>;
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border bg-[color:var(--bg-elev)] p-2 text-center">
      <div className="text-[10px] text-[color:var(--fg-muted)]">{l}</div>
      <div className="font-bold mt-0.5">{v}</div>
    </div>
  );
}
