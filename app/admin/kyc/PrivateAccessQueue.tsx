'use client';

import * as React from 'react';
import { Lock, Check, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { setPrivateAccessAction } from '@/lib/private-access-actions';

interface Req { id: string; name: string; email: string }

/** Admin: bekleyen gizli portföy erişim talepleri (Tur6 #4c). */
export function PrivateAccessQueue({ initial }: { initial: Req[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Req[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(userId: string, status: 'approved' | 'rejected') {
    setBusy(userId);
    const res = await setPrivateAccessAction(userId, status);
    setBusy(null);
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== userId));
      toast({ variant: 'success', title: status === 'approved' ? 'Onaylandı' : 'Reddedildi' });
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <CardBody>
        <h3 className="font-semibold inline-flex items-center gap-2 mb-3">
          <Lock size={15} className="text-gold-300" /> Gizli Portföy Talepleri
          <span className="text-xs rounded-full bg-gold-400 text-navy-900 px-1.5">{items.length}</span>
        </h3>
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{r.name}</div>
                <div className="text-xs text-[color:var(--fg-muted)] truncate">{r.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => decide(r.id, 'rejected')} disabled={busy === r.id}><X size={14} /> Reddet</Button>
                <Button variant="gold" size="sm" onClick={() => decide(r.id, 'approved')} loading={busy === r.id}><Check size={14} /> Onayla</Button>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
