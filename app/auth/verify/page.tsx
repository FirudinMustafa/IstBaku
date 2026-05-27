import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { verifyEmailWithToken } from '@/lib/auth-actions';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await verifyEmailWithToken(token)
    : { ok: false, error: 'Token eksik.' as string | undefined };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 ai-hero-bg -z-10" />
      <Card className="w-full max-w-md">
        <CardBody className="p-8 text-center">
          {result.ok ? (
            <>
              <div className="mx-auto size-16 rounded-full bg-success/15 text-success flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">E-postan doğrulandı</h1>
              <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
                {('emailJustVerified' in result && result.emailJustVerified)
                  ? 'Hoş geldin! Yatırımcı panelin artık aktif.'
                  : 'Hesabın zaten doğrulanmış — paneline geçebilirsin.'}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Link href="/dashboard"><Button variant="gold" size="lg" className="w-full">Panele Git <ArrowRight size={14} /></Button></Link>
                <Link href="/auth/sign-in" className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300">Önce giriş yapayım</Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto size-16 rounded-full bg-danger/15 text-danger flex items-center justify-center">
                <XCircle size={32} />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Doğrulama başarısız</h1>
              <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
                {result.error ?? 'Bilinmeyen bir hata oluştu.'}
              </p>
              <p className="mt-2 text-xs text-[color:var(--fg-faint)]">
                Link 24 saat geçerli ve tek kullanımlık. Yenisini istemek için panele giriş yap.
              </p>
              <Link href="/dashboard" className="mt-6 inline-block">
                <Button variant="outline" size="md">Panele Git</Button>
              </Link>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
