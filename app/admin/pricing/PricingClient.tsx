'use client';

import * as React from 'react';
import { CreditCard, Loader2, Save } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { updatePricingAction } from '@/lib/pricing-actions';

// İç anahtar listesi + etiketler (server'dan bağımsız; db import etmeden).
type PriceKey = 'date_renewal' | 'istbaku_badge' | 'private' | 'tier_guclu' | 'tier_premium';
const FIELDS: { key: PriceKey; label: string; hint: string }[] = [
  { key: 'date_renewal', label: 'Tarih yenileme', hint: 'İlan tarihini tazeleme ücreti' },
  { key: 'istbaku_badge', label: 'İstBaku Onaylı rozet', hint: 'Onaylı rozet / premium başvuru ücreti' },
  { key: 'private', label: 'Gizli portföy', hint: 'İlanı gizli portföye alma ücreti' },
  { key: 'tier_guclu', label: 'Tier yükseltme — Güçlü', hint: 'Güçlü pakete yükseltme ücreti' },
  { key: 'tier_premium', label: 'Tier yükseltme — Premium', hint: 'Premium pakete yükseltme ücreti' },
];

export function PricingClient({ initial }: { initial: Record<PriceKey, number> }) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  // USD (dolar) cinsinden düzenle; kaydederken cent'e çevir.
  const [dollars, setDollars] = React.useState<Record<PriceKey, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, String((initial[f.key] ?? 0) / 100)])) as Record<PriceKey, string>,
  );

  async function save() {
    const updates: Partial<Record<PriceKey, number>> = {};
    for (const f of FIELDS) {
      const d = parseFloat(dollars[f.key]);
      if (!Number.isFinite(d) || d < 0) {
        toast({ variant: 'error', title: 'Geçersiz fiyat', description: `${f.label} için geçerli bir tutar gir.` });
        return;
      }
      updates[f.key] = Math.round(d * 100); // cent
    }
    setSaving(true);
    const res = await updatePricingAction(updates);
    setSaving(false);
    if (res.ok) toast({ variant: 'success', title: 'Kaydedildi', description: 'Fiyatlar güncellendi.' });
    else toast({ variant: 'error', title: 'Hata', description: res.error });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard size={20} className="text-gold-300" /> Fiyatlandırma
        </h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">
          Platform ücretleri (USD). Değişiklikler tüm ödeme noktalarında geçerli olur.
        </p>
      </div>

      <Card>
        <CardBody className="p-5 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid sm:grid-cols-[1fr_auto] sm:items-center gap-2">
              <div>
                <Label>{f.label}</Label>
                <p className="text-xs text-[color:var(--fg-muted)]">{f.hint}</p>
              </div>
              <div className="relative w-full sm:w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)] text-sm">$</span>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  className="pl-7"
                  value={dollars[f.key]}
                  onChange={(e) => setDollars((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-[color:var(--border)] flex justify-end">
            <Button variant="gold" onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Kaydet
            </Button>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-[color:var(--fg-faint)]">
        Not: Fiyatlar USD cent olarak saklanır. Tutarlar yeni oluşturulan ödemelerde geçerli olur;
        mevcut bekleyen ödemeler oluşturuldukları tutarda kalır.
      </p>
    </div>
  );
}
