import { Shield, Bot, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getAuditLog } from '@/lib/admin-queries';
import { timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const rows = await getAuditLog(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Denetim Logu</h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">
          Tüm admin ve sistem aksiyonlarının değiştirilemez kaydı ({rows.length} kayıt)
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-[color:var(--fg-muted)]">
              Henüz audit kaydı yok.
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((a) => {
                const isSystem = !a.actorId || a.actorEmail === 'system';
                return (
                  <div key={a.id} className="flex items-start gap-3 p-4 hover:bg-[color:var(--bg-card-hover)]">
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                      isSystem ? 'bg-navy-500/15 text-navy-300' : 'bg-gold-400/15 text-gold-300'
                    }`}>
                      {isSystem ? <Bot size={15} /> : <Shield size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <strong>{a.action}</strong>
                        <span className="text-[color:var(--fg-muted)]"> · </span>
                        <span className="font-mono text-xs">{a.target}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[color:var(--fg-muted)] flex-wrap">
                        <Badge variant="outline" className="!text-[10px]">{a.actorEmail ?? 'system'}</Badge>
                        <span>·</span>
                        <span>{timeAgo(a.createdAt.toISOString())}</span>
                        <span>·</span>
                        <span className="font-mono">{a.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4 text-sm flex items-start gap-3">
        <AlertCircle size={16} className="text-gold-300 mt-0.5" />
        <div>
          <strong>Production'da:</strong>
          <p className="text-[color:var(--fg-muted)] text-xs mt-1">
            Tüm log kayıtları immutable storage'a yazılır (append-only). KVKK/GDPR uyumlu, en az 5 yıl saklanır. Webhook ile SIEM'e iletilir.
          </p>
        </div>
      </div>
    </div>
  );
}
