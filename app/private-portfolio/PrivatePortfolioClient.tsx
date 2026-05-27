'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck, FileSignature, Crown, CheckCircle2, Star } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/user-auth';
import { formatPrice } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

export function PrivatePortfolioClient({ initial }: { initial: Property[] }) {
  const { toast } = useToast();
  const { user } = useUser();
  const props = initial;
  const [unlocked, setUnlocked] = React.useState(false);
  const [modal, setModal] = React.useState(false);

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[500px] ai-hero-bg -z-10" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="gold"><Crown size={11} /> Gizli Portföy</Badge>
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">Sadece davetli yatırımcılara açık.</h1>
          <p className="mt-4 text-[color:var(--fg-muted)] text-pretty">
            ISTBAKU'nun premium koleksiyonu — pazarın görmediği lüks ilanlar. KYC tamamla, NDA imzala, kapıyı arala.
          </p>
          {!unlocked && (
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="gold" size="lg" onClick={() => setModal(true)}><Lock size={15} /> Profili Tamamla & Aç</Button>
              <Link href="/listings"><Button variant="outline" size="lg">Genel İlanları Gör</Button></Link>
            </div>
          )}
          {unlocked && (
            <div className="mt-6 inline-flex items-center gap-2 text-success">
              <CheckCircle2 size={18} /> Hoş geldin. {props.length} özel ilan açıldı.
            </div>
          )}
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { i: ShieldCheck, l: 'KYC Doğrulaması', d: 'Kimlik + finansal profil' },
            { i: FileSignature, l: 'NDA İmzası', d: 'Dijital, 2 dakika sürer' },
            { i: Crown, l: 'Premium Üyelik', d: 'Tek seferlik veya yıllık' },
          ].map((it) => (
            <Card key={it.l}><CardBody className="text-center">
              <it.i size={20} className="text-gold-300 mx-auto" />
              <div className="font-semibold mt-2">{it.l}</div>
              <p className="text-xs text-[color:var(--fg-muted)] mt-1">{it.d}</p>
            </CardBody></Card>
          ))}
        </div>

        <div className="mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Koleksiyon önizleme</h2>
            <Badge variant="gold">{props.length} ilan</Badge>
          </div>
          {props.length === 0 ? (
            <Card><CardBody className="text-center py-16 text-[color:var(--fg-muted)]">
              <Lock size={32} className="mx-auto text-gold-300/60" />
              <p className="mt-3 text-sm">Şu an gizli portföyde gösterilecek ilan yok.</p>
              <p className="text-xs mt-1">Yeni eklemeler için bildirimlere abone ol.</p>
            </CardBody></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {props.map((p) => (
                <Link
                  key={p.id}
                  href={unlocked ? `/property/${p.slug}` : '#'}
                  onClick={(e) => { if (!unlocked) { e.preventDefault(); setModal(true); } }}
                  className="group relative rounded-2xl border bg-[color:var(--bg-card)] overflow-hidden"
                >
                  <div className="relative aspect-[4/3]">
                    <img src={p.images[0]} alt="" className={cn('absolute inset-0 w-full h-full object-cover transition-all', !unlocked && 'blur-xl scale-105')} />
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <Lock size={28} className="text-gold-300 animate-pulse-glow" />
                        <div className="mt-2 text-white text-sm font-semibold">Profili tamamlayıp aç</div>
                      </div>
                    )}
                    <Badge variant="gold" className="absolute top-3 left-3"><Star size={11} /> Premium</Badge>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold">{unlocked ? p.title : '••••••••• Premium konut •••••••••'}</div>
                    <div className="text-xs text-[color:var(--fg-muted)] mt-1">{unlocked ? `${p.city} · ${p.district}` : '••• · •••'}</div>
                    <div className="mt-3 text-gold-300 font-bold">{unlocked ? formatPrice(p.price, p.currency) : '$ •••,•••'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Yatırımcı Profili" size="md">
        <div className="space-y-3">
          <div><Label>Ad Soyad</Label><Input defaultValue={user?.name ?? ''} placeholder="Adınız" /></div>
          <div><Label>E-posta</Label><Input defaultValue={user?.email ?? ''} placeholder="ornek@mail.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ülke</Label>
              <Select><option>Türkiye</option><option>Azerbaycan</option><option>Rusya</option><option>BAE</option><option>İran</option><option>Diğer</option></Select>
            </div>
            <div><Label>Yıllık gelir aralığı</Label>
              <Select><option>$100K-250K</option><option>$250K-500K</option><option>$500K-1M</option><option>$1M+</option></Select>
            </div>
          </div>
          <div className="rounded-xl border bg-[color:var(--bg-elev)] p-3 text-xs">
            <FileSignature size={13} className="inline text-gold-300" /> NDA dijital imzası ile kişisel bilgileriniz gizli kalır. Sadece doğrulama ekibi erişebilir.
          </div>
          <Button variant="gold" className="w-full" onClick={() => { setUnlocked(true); setModal(false); toast({ variant: 'success', title: 'Gizli Portföy açıldı', description: 'Premium ilanlar artık görüntülenebilir.' }); }}>
            <CheckCircle2 size={14} /> Onayla & Aç
          </Button>
        </div>
      </Modal>
    </div>
  );
}
