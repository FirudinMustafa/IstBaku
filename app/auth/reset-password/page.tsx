'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { resetPasswordAction } from '@/lib/auth-actions';
import { resetPasswordSchema, fieldErrors } from '@/lib/schemas';

function ResetPasswordInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get('token') ?? '';
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [serverErr, setServerErr] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr('');
    const parsed = resetPasswordSchema.safeParse({ token, password, confirm });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return;
    }
    setErrors({});

    setBusy(true);
    const res = await resetPasswordAction(parsed.data.token, parsed.data.password);
    setBusy(false);
    if (!res.ok) {
      setServerErr(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/auth/sign-in'), 1800);
  }

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md"><CardBody className="p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-danger" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold">Geçersiz link</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2">Bu link eksik veya bozuk. Sıfırlama mailindeki linke tıkladığından emin ol.</p>
          <Link href="/auth/forgot-password" className="mt-4 inline-block text-gold-300 hover:text-gold-400">Yeni link iste</Link>
        </CardBody></Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 ai-hero-bg -z-10" />
      <Card className="w-full max-w-md">
        <CardBody className="p-6 md:p-8">
          <div className="text-center">
            <Badge variant="ai"><Lock size={11} aria-hidden="true" /> Yeni Şifre</Badge>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Şifreni belirle</h1>
            <p className="text-sm text-[color:var(--fg-muted)] mt-1">
              Yeni şifreni iki kez gir — en az 8 karakter.
            </p>
          </div>

          {!done ? (
            <form onSubmit={submit} noValidate className="mt-6 space-y-3">
              <Input
                id="reset-password"
                label="Yeni şifre"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                error={errors.password}
              />
              <Input
                id="reset-confirm"
                label="Tekrar gir"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                error={errors.confirm}
              />

              {serverErr && (
                <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {serverErr}
                </div>
              )}

              <Button type="submit" variant="gold" size="lg" className="w-full" loading={busy}>
                Şifreyi Güncelle
              </Button>
            </form>
          ) : (
            <div role="status" aria-live="polite" className="mt-6 text-center space-y-3">
              <div className="mx-auto size-14 rounded-full bg-success/15 text-success flex items-center justify-center">
                <CheckCircle2 size={26} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">Şifren güncellendi</h2>
              <p className="text-sm text-[color:var(--fg-muted)]">Giriş sayfasına yönlendiriliyorsun…</p>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/auth/sign-in" className="text-gold-300 hover:text-gold-400 inline-flex items-center gap-1">
              <ArrowLeft size={13} aria-hidden="true" /> Girişe dön
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div role="status" aria-live="polite" className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-[color:var(--fg-muted)]">Yükleniyor…</div>}>
      <ResetPasswordInner />
    </React.Suspense>
  );
}
