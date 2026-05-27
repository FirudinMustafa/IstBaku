'use client';

import Link from 'next/link';
import { Sparkles, ShieldCheck, Brain, Lock, LineChart } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function FeatureBento() {
  return (
    <section className="relative w-full px-4 py-6 sm:py-10">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="ai" className="mb-3"><Sparkles size={11} /> AI Katmanı</Badge>
        <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-balance">
          Sıradan emlak sitelerinden bizi <span className="text-gold-300">ayıran</span> şey
        </h2>
        <p className="mt-3 text-[color:var(--fg-muted)] text-pretty">
          Bilgi yığını değil, kararlar üretiyoruz. AI’ı arayüze değil, iş akışına yerleştirdik.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Big AI Score */}
        <Link href="/listings" className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-[color:var(--bg-card)] p-7 hover:border-gold-400/60 transition-colors">
          <div className="absolute -top-20 -right-20 w-72 h-72 aurora rounded-full opacity-60 pointer-events-none" />
          <Badge variant="gold" className="mb-4"><Brain size={11} /> Yatırım Skoru</Badge>
          <h3 className="text-2xl font-bold">Her ilana 100 üzerinden AI puanı</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)] max-w-md">
            Bölge talebi, fiyat-konum oranı, kira getirisi ve yabancı yatırımcı ilgisini içeren açıklanabilir skor.
            Hangi parametre kaç puan getirdi, görebilirsiniz.
          </p>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              { l: 'Bölge', v: 92 },
              { l: 'Fiyat', v: 88 },
              { l: 'Kira Getirisi', v: 82 },
              { l: 'Talep', v: 95 },
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
          <Badge variant="ai" className="mb-3"><Sparkles size={11} /> AI Eşleşme</Badge>
          <h3 className="text-xl font-bold">Sana özel 5 ilan</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            Hedeflerini söyle (oturum/kira/yazlık/yatırım), bütçeni gir. AI sana en uygunları seçsin — gerekçeleriyle birlikte.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">Oturum</span>
            <span className="rounded-full border px-2.5 py-1">Kira</span>
            <span className="rounded-full border px-2.5 py-1">Yazlık</span>
            <span className="rounded-full border px-2.5 py-1">Yatırım</span>
          </div>
        </Link>

        {/* Private */}
        <Link href="/private-portfolio" className="group rounded-3xl border bg-gradient-to-br from-navy-700 to-navy-900 p-6 hover:border-gold-400/60 transition-colors relative overflow-hidden">
          <Lock size={20} className="text-gold-300" />
          <h3 className="text-xl font-bold mt-4 text-white">Gizli Portföy</h3>
          <p className="mt-2 text-sm text-navy-200">
            Sadece doğrulanmış yatırımcılara açık lüks ilanlar. NDA ile kapı aralanır.
          </p>
          <div className="mt-5 text-xs text-gold-300">Profili tamamla →</div>
        </Link>

        {/* Multi-currency */}
        <Link href="/listings" className="group rounded-3xl border bg-[color:var(--bg-card)] p-6 hover:border-gold-400/60 transition-colors">
          <Badge variant="navy" className="mb-3">💱 Çoklu Para Birimi</Badge>
          <h3 className="text-xl font-bold">Sınırların ötesinde yatırım</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            Tek panelden farklı pazarlar, anlık çapraz kur ve şeffaf gider hesaplaması.
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
          <Badge variant="success" className="mb-3"><ShieldCheck size={11} /> Güven</Badge>
          <h3 className="text-xl font-bold">ISTBAKU Onaylı</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            3 seviye rozet: Kimlik, tapu, saha ziyareti. Sahte ilana, hayalet daireye geçit yok.
          </p>
        </Link>

        {/* Reports */}
        <Link href="/reports" className="group rounded-3xl border bg-[color:var(--bg-card)] p-6 hover:border-gold-400/60 transition-colors">
          <Badge variant="ai" className="mb-3"><LineChart size={11} /> Veri</Badge>
          <h3 className="text-xl font-bold">Yatırım Raporları</h3>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            Bölgesel talep, yabancı ilgi, fiyat trendi ve kira/satış oranı — yatırımcı için.
          </p>
        </Link>
      </div>
    </section>
  );
}
