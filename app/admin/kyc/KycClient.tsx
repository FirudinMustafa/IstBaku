'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Check, X, Sparkles, Eye, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { timeAgo, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { approveKycAction, rejectKycAction } from '@/lib/admin-actions';

const TYPE_KEY: Record<string, string> = {
  investor: 'admin.kyc.type.investor',
  agent_license: 'admin.kyc.type.agentLicense',
  title_deed: 'admin.kyc.type.titleDeed',
};

interface KycItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  type: string;
  documents: { name: string; url: string }[];
  status: 'none' | 'pending' | 'approved' | 'rejected';
  aiCheckScore: number;
  aiCheckNotes: string | null;
  submittedAt: string;
}

export function KycClient({ initialItems }: { initialItems: KycItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [items, setItems] = React.useState<KycItem[]>(initialItems);
  const [selected, setSelected] = React.useState<string | undefined>(items[0]?.id);
  const [working, setWorking] = React.useState(false);

  const active = items.find((k) => k.id === selected);

  async function approve() {
    if (!active) return;
    setWorking(true);
    const res = await approveKycAction(active.id);
    setWorking(false);
    if (res.ok) {
      setItems((cur) => cur.map((k) => (k.id === active.id ? { ...k, status: 'approved' } : k)));
      toast({ variant: 'success', title: t('admin.kyc.toast.approved'), description: t('admin.kyc.toast.approvedDesc').replace('{name}', active.userName) });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('admin.kyc.toast.approveFail') });
    }
  }

  async function reject() {
    if (!active) return;
    setWorking(true);
    const res = await rejectKycAction(active.id);
    setWorking(false);
    if (res.ok) {
      setItems((cur) => cur.map((k) => (k.id === active.id ? { ...k, status: 'rejected' } : k)));
      toast({ variant: 'info', title: t('admin.kyc.toast.rejected') });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('admin.kyc.toast.rejectFail') });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.kyc.title')}</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">{t('admin.kyc.subtitle')}</p>
      </div>

      {items.length === 0 && (
        <Card><CardBody className="text-center py-12 text-[color:var(--fg-muted)]">
          <ShieldCheck size={28} className="mx-auto text-success" />
          <p className="mt-2">{t('admin.kyc.empty')}</p>
        </CardBody></Card>
      )}

      {items.length > 0 && (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-2">
            {items.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelected(k.id)}
                className={cn(
                  'w-full text-left rounded-2xl border p-3 flex items-start gap-3 transition-colors',
                  selected === k.id ? 'border-gold-400 bg-gold-400/5' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-card-hover)]',
                )}
              >
                {k.userAvatar && <img src={k.userAvatar} alt="" className="size-10 rounded-full" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{k.userName}</div>
                    {k.status !== 'pending' && (
                      <Badge variant={k.status === 'approved' ? 'success' : 'danger'} className="!text-[10px]">{t(`status.${k.status}`)}</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-[color:var(--fg-muted)]">{t(TYPE_KEY[k.type] ?? k.type)} · {timeAgo(k.submittedAt)}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Sparkles size={10} className="text-gold-300" />
                    <span className={cn('text-[11px] font-bold', k.aiCheckScore >= 80 ? 'text-success' : 'text-gold-300')}>{k.aiCheckScore}/100</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {active && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-4">
                  {active.userAvatar && <img src={active.userAvatar} alt="" className="size-16 rounded-2xl" />}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{active.userName}</h2>
                    <div className="text-sm text-[color:var(--fg-muted)]">{active.userEmail}</div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <Badge variant="ai">{t(TYPE_KEY[active.type] ?? active.type)}</Badge>
                      <span className="text-xs text-[color:var(--fg-muted)]">{t('admin.kyc.submitted').replace('{time}', timeAgo(active.submittedAt))}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-[color:var(--bg-elev)] p-4">
                    <div className="text-xs uppercase text-[color:var(--fg-muted)] mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-gold-300" /> {t('admin.kyc.aiPrecheck')}
                    </div>
                    <div className={cn('text-3xl font-bold', active.aiCheckScore >= 80 ? 'text-success' : 'text-gold-300')}>
                      {active.aiCheckScore}/100
                    </div>
                    <p className="text-xs text-[color:var(--fg-muted)] mt-2">{active.aiCheckNotes ?? '—'}</p>
                  </div>

                  <div className="rounded-xl border bg-[color:var(--bg-elev)] p-4">
                    <div className="text-xs uppercase text-[color:var(--fg-muted)] mb-3">{t('admin.kyc.documents')}</div>
                    <div className="space-y-2">
                      {active.documents.map((d) => (
                        <a key={d.name} href={d.url} className="flex items-center justify-between gap-2 p-2 rounded-lg border hover:bg-[color:var(--bg-card-hover)] text-sm">
                          <span className="inline-flex items-center gap-2"><FileText size={13} className="text-gold-300" /> {d.name}</span>
                          <Eye size={12} className="text-[color:var(--fg-muted)]" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-gold-400/30 bg-gold-400/5 p-4 text-sm flex items-start gap-3">
                  <AlertTriangle size={16} className="text-gold-300 mt-0.5" />
                  <div className="flex-1">
                    <strong>{t('admin.kyc.manualReview')}</strong>
                    <ul className="mt-1.5 text-xs text-[color:var(--fg-muted)] list-disc list-inside space-y-0.5">
                      <li>{t('admin.kyc.check1')}</li>
                      <li>{t('admin.kyc.check2')}</li>
                      <li>{t('admin.kyc.check3').replace('{score}', String(active.aiCheckScore))}</li>
                    </ul>
                  </div>
                </div>

                {active.status === 'pending' ? (
                  <div className="mt-6 flex items-center gap-2 justify-end">
                    <Button variant="ghost" className="text-danger hover:bg-danger/10 gap-1.5" onClick={reject} loading={working}>
                      <X size={14} /> {t('admin.kyc.reject')}
                    </Button>
                    <Button variant="gold" className="gap-1.5" onClick={approve} loading={working}>
                      <ShieldCheck size={14} /> {t('admin.kyc.approve')}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 flex justify-end">
                    <Badge variant={active.status === 'approved' ? 'success' : 'danger'}>
                      {active.status === 'approved' ? <><Check size={11} /> {t('admin.kyc.approvedBadge')}</> : <><X size={11} /> {t('admin.kyc.rejectedBadge')}</>}
                    </Badge>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
