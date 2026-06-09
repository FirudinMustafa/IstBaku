'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Send, Mail } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { markRpaReportSentAction, type AdminRpaReport } from '@/lib/rpa-actions';

function formatNo(n: number) {
  return String(n).padStart(5, '0');
}

export function RpaAdminClient({ pending, sentCount }: { pending: AdminRpaReport[]; sentCount: number }) {
  const router = useRouter();
  const { t } = useLang();
  const { toast } = useToast();
  const [rows, setRows] = React.useState<AdminRpaReport[]>(pending);
  const [fileUrls, setFileUrls] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  async function markSent(id: string) {
    setBusy(id);
    const res = await markRpaReportSentAction(id, fileUrls[id] || undefined);
    setBusy(null);
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ variant: 'success', title: t('admin.rpa.toast.marked'), description: t('admin.rpa.toast.markedDesc') });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('admin.rpa.toast.fail'), description: res.error });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><FileText size={20} className="text-gold-300" /> {t('admin.rpa.title')}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="gold">{t('admin.rpa.pending').replace('{n}', String(rows.length))}</Badge>
          <Badge variant="success">{t('admin.rpa.sent').replace('{n}', String(sentCount))}</Badge>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">{t('admin.rpa.empty')}</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{r.userName} <span className="text-[color:var(--fg-muted)]">· {r.userEmail}</span></div>
                    <div className="text-xs text-[color:var(--fg-muted)] mt-0.5 font-mono">
                      {r.listingNumbers.map((n) => `#${formatNo(n)}`).join(', ')}
                    </div>
                  </div>
                  <Badge variant="gold">{t('status.pending')}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    value={fileUrls[r.id] ?? ''}
                    onChange={(e) => setFileUrls((s) => ({ ...s, [r.id]: e.target.value }))}
                    placeholder={t('admin.rpa.filePh')}
                    className="flex-1 min-w-[200px]"
                  />
                  <Button variant="gold" size="sm" onClick={() => markSent(r.id)} loading={busy === r.id}>
                    <Send size={14} /> {t('admin.rpa.markSent')}
                  </Button>
                </div>
                <p className="text-[11px] text-[color:var(--fg-faint)] inline-flex items-center gap-1">
                  <Mail size={11} /> {t('admin.rpa.instruction')}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
