'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { adminSignInAction } from '@/lib/auth-actions';

// MC-01 fix: hardcoded demo credentials removed from this client bundle.
// Production runs MFA + IP allow-list and never leaks default passwords to
// the browser.

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const res = await adminSignInAction(email, password);
    setBusy(false);
    if (res.ok) {
      toast({ variant: 'success', title: `Hoş geldin, ${res.name}`, description: `Rol: ${res.role}` });
      router.replace('/admin');
    } else {
      // PB-02 / PF-14: always populate [role=alert] on failure. The generic
      // copy preserves the no-enumeration property — wrong email and wrong
      // password produce the same message — so attackers can't probe for
      // valid admin emails.
      setErr(res.error ?? 'E-posta veya şifre hatalı.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 ai-hero-bg relative">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Card>
          <CardBody className="p-6 md:p-8">
            <Badge variant="ai" className="!py-1"><ShieldCheck size={11} /> Admin Console</Badge>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Yönetim Paneli Girişi</h1>
            <p className="text-sm text-[color:var(--fg-muted)] mt-1">Sadece yetkili personel erişebilir.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
              <div>
                <Label htmlFor="admin-email">E-posta</Label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3 text-[color:var(--fg-muted)]" />
                  <Input id="admin-email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
                </div>
              </div>
              <div>
                <Label htmlFor="admin-password">Şifre</Label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-3 text-[color:var(--fg-muted)]" />
                  <Input id="admin-password" type="password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
              </div>

              {err && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger flex items-center gap-2" role="alert" aria-live="polite">
                  <AlertCircle size={14} /> {err}
                </div>
              )}

              <Button type="submit" variant="gold" size="lg" className="w-full" loading={busy}>
                <ShieldCheck size={14} /> Güvenli Giriş
              </Button>
              <p className="text-[11px] text-[color:var(--fg-faint)] text-center">
                * Production'da MFA + IP allow-list zorunlu.
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
