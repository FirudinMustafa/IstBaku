import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/i18n/T';

export function CTA() {
  return (
    <section className="w-full px-4 py-6 sm:py-10">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-navy-700 to-navy-900 p-10 sm:p-14 text-center">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] aurora rounded-full opacity-40 pointer-events-none" />
        <Sparkles size={28} className="text-gold-300 mx-auto" />
        <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold text-white text-balance">
          <T k="home.cta.title" />
        </h2>
        <p className="mt-3 text-navy-200 max-w-xl mx-auto text-pretty">
          <T k="home.cta.sub" />
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/ai-match">
            <Button variant="gold" size="lg">
              <T k="home.cta.start" /> <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="bg-white/5 text-white border-white/20 hover:bg-white/10">
              <T k="home.cta.panel" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
