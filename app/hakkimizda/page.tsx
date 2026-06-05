import type { Metadata } from 'next';
import { Building2, Target, Compass } from 'lucide-react';
import { T } from '@/components/i18n/T';

export const metadata: Metadata = {
  title: 'Hakkımızda — ISTBAKU',
  description:
    'ISTBAKU\'nun hikayesi, misyonu ve vizyonu. İstanbul ve Bakü\'den dünyaya uzanan, teknoloji ve güven temelli emlak platformu.',
};

// Kurumsal içerik — i18n anahtarlarıyla (Madde 1). Dil değişince çevrilir.
export default function HakkimizdaPage() {
  return (
    <div className="bg-[color:var(--bg)]">
      {/* Üst başlık — koyu lacivert, marka dokusu */}
      <section className="dark relative overflow-hidden bg-[#121F30] text-white">
        <div
          className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full pointer-events-none blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(202,174,153,0.30) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-16 w-[520px] h-[520px] rounded-full pointer-events-none blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(202,174,153,0.22) 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <span className="inline-block text-[11px] uppercase tracking-[0.22em] text-gold-300 font-semibold">
            ISTBAKU
          </span>
          <h1 className="font-display mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
            <T k="about.hero.title" />
          </h1>
          <p className="mt-4 text-sm sm:text-base text-navy-100/80 max-w-2xl mx-auto">
            <T k="about.hero.subtitle" />
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-14">
        {/* Hakkımızda */}
        <Section icon={Building2} kicker={<T k="about.s1.kicker" />} title={<T k="about.s1.title" />}>
          <p><T k="about.s1.p1" /></p>
          <p><T k="about.s1.p2" /></p>
        </Section>

        {/* Misyonumuz */}
        <Section icon={Target} kicker={<T k="about.s2.kicker" />} title={<T k="about.s2.title" />}>
          <p><T k="about.s2.p1" /></p>
          <p><T k="about.s2.p2" /></p>
          <p><T k="about.s2.p3" /></p>
        </Section>

        {/* Vizyonumuz */}
        <Section icon={Compass} kicker={<T k="about.s3.kicker" />} title={<T k="about.s3.title" />}>
          <p><T k="about.s3.p1" /></p>
          <p><T k="about.s3.p2" /></p>
          <p><T k="about.s3.p3" /></p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  kicker,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  kicker: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="size-10 rounded-xl bg-gold-400/15 text-gold-300 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </span>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold-300 font-semibold">{kicker}</div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-[color:var(--fg-muted)]">{children}</div>
    </section>
  );
}
