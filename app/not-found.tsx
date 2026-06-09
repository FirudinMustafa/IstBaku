import Link from 'next/link';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/i18n/T';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 ai-hero-bg relative">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="relative text-center max-w-md">
        <div className="size-20 rounded-3xl bg-gold-400/15 text-gold-300 flex items-center justify-center mx-auto">
          <Compass size={36} />
        </div>
        <h1 className="mt-6 text-6xl font-bold tracking-tight bg-gradient-to-br from-gold-300 to-gold-500 bg-clip-text text-transparent">
          404
        </h1>
        <p className="mt-2 text-lg text-[color:var(--fg)]"><T k="error.404.title" /></p>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
          <T k="error.404.body" />
        </p>
        <div className="mt-7 flex flex-wrap gap-2 justify-center">
          <Link href="/"><Button variant="gold" className="gap-1.5"><Home size={14} /> <T k="error.home" /></Button></Link>
          <Link href="/listings"><Button variant="outline" className="gap-1.5"><ArrowLeft size={14} /> <T k="error.toListings" /></Button></Link>
        </div>
      </div>
    </div>
  );
}
