import Link from 'next/link';
import { Clock, ArrowLeft } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const metadata = {
  title: 'Çok Yakında — ISTBAKU',
  description: 'Bu sayfa yakında yayında.',
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const topic = sp.topic ?? null;
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 ai-hero-bg -z-10" />
      <Card className="w-full max-w-md">
        <CardBody className="p-8 text-center">
          <div className="mx-auto size-16 rounded-full bg-gold-400/15 text-gold-300 flex items-center justify-center">
            <Clock size={32} aria-hidden="true" />
          </div>
          <div className="mt-4">
            <Badge variant="ai">Çok Yakında</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Bu sayfa yapım aşamasında</h1>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            {topic
              ? `"${topic}" sayfası yakın zamanda yayında olacak.`
              : 'İçerik kısa süre içinde yayında olacak. Lütfen daha sonra tekrar dene.'}
          </p>
          <Link href="/" className="mt-6 inline-block">
            <Button variant="gold" size="md" className="gap-2">
              <ArrowLeft size={14} /> Ana sayfaya dön
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
