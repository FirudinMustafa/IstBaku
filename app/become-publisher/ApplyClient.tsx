'use client';

import * as React from 'react';
import Link from 'next/link';
import { Newspaper, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { applyForPublisherAction, getMyPublisherApplication } from '@/lib/publisher-actions';

export function ApplyClient() {
  const { t } = useLang();
  const { toast } = useToast();
  const [role, setRole] = React.useState<string | null>(null); // null = yükleniyor
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    getMyPublisherApplication()
      .then((r) => { if (!alive) return; setRole(r.role); setDone(r.status === 'pending'); })
      .catch(() => { if (alive) setRole('guest'); });
    return () => { alive = false; };
  }, []);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const res = await applyForPublisherAction(note);
    setBusy(false);
    if (res.ok) { setDone(true); toast({ variant: 'success', title: t('pub.apply.sent'), description: t('pub.apply.sentDesc') }); }
    else toast({ variant: 'error', title: t('pub.apply.fail'), description: res.error });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 md:py-12">
      <div className="text-center">
        <div className="mx-auto size-14 rounded-2xl bg-gold-400/15 text-gold-300 flex items-center justify-center"><Newspaper size={26} /></div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold">{t('pub.apply.title')}</h1>
        <p className="mt-2 text-[color:var(--fg-muted)]">{t('pub.apply.intro')}</p>
      </div>

      <Card className="mt-6">
        <CardBody className="p-6 space-y-4">
          {role === null ? (
            <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-gold-300" /></div>
          ) : role === 'guest' ? (
            <div className="text-center space-y-3">
              <p className="text-sm">{t('pub.apply.guest')}</p>
              <Link href="/auth/sign-in"><Button variant="gold">{t('nav.signin')}</Button></Link>
            </div>
          ) : role === 'blog_publisher' ? (
            <div className="text-center space-y-3">
              <CheckCircle2 size={28} className="mx-auto text-success" />
              <p className="text-sm">{t('pub.apply.already')}</p>
              <Link href="/publisher"><Button variant="gold">{t('pub.apply.toPanel')}</Button></Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-2">
              <Clock size={28} className="mx-auto text-gold-300" />
              <p className="text-sm font-medium">{t('pub.apply.pending')}</p>
              <p className="text-xs text-[color:var(--fg-muted)]">{t('pub.apply.pendingDesc')}</p>
            </div>
          ) : (
            <>
              <Textarea
                id="pub-note"
                label={t('pub.apply.noteLabel')}
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('pub.apply.notePh')}
                maxLength={1000}
              />
              <Button variant="gold" className="w-full" onClick={submit} loading={busy}>{t('pub.apply.submit')}</Button>
              <p className="text-[11px] text-[color:var(--fg-faint)] text-center">{t('pub.apply.reviewNote')}</p>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
