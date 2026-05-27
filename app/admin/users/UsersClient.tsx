'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, BadgeCheck, Ban, Mail, Crown } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { timeAgo, cn } from '@/lib/utils';
import { suspendUserAction, reactivateUserAction } from '@/lib/admin-actions';
import { useToast } from '@/components/ui/Toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  country: string;
  status: 'active' | 'pending' | 'suspended';
  kyc: 'none' | 'pending' | 'approved' | 'rejected';
  premium: boolean;
  joinedAt: string;
  lastSeen: string;
}

const KYC_BADGE: Record<User['kyc'], { l: string; v: 'success' | 'gold' | 'default' | 'danger' }> = {
  approved: { l: 'KYC ✓', v: 'success' },
  pending: { l: 'KYC bekliyor', v: 'gold' },
  rejected: { l: 'KYC red', v: 'danger' },
  none: { l: 'KYC yok', v: 'default' },
};

export function UsersClient({ initial }: { initial: User[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = React.useState<User[]>(initial);
  const [q, setQ] = React.useState('');
  const [role, setRole] = React.useState<'all' | string>('all');
  const [status, setStatus] = React.useState<'all' | User['status']>('all');
  const [working, setWorking] = React.useState<string | null>(null);

  async function toggleStatus(u: User) {
    setWorking(u.id);
    const res = u.status === 'suspended'
      ? await reactivateUserAction(u.id)
      : await suspendUserAction(u.id);
    setWorking(null);
    if (res.ok) {
      const newStatus = u.status === 'suspended' ? 'active' as const : 'suspended' as const;
      setUsers((cur) => cur.map((x) => (x.id === u.id ? { ...x, status: newStatus } : x)));
      toast({ variant: 'success', title: newStatus === 'suspended' ? 'Kullanıcı askıya alındı' : 'Kullanıcı tekrar aktif' });
      router.refresh();
    }
  }

  const filtered = users.filter((u) => {
    if (role !== 'all' && u.role !== role) return false;
    if (status !== 'all' && u.status !== status) return false;
    if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kullanıcılar</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">{filtered.length} sonuç · Toplam {users.length}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[color:var(--fg-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ad veya e-posta…"
              className="h-9 w-64 pl-9 pr-3 rounded-lg bg-[color:var(--bg-elev)] border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </div>
          <Select className="w-36" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">Tüm roller</option>
            <option value="user">Kullanıcı</option>
            <option value="agent">Emlakçı</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="super_admin">Süper Admin</option>
          </Select>
          <Select className="w-36" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="pending">Onay bekliyor</option>
            <option value="suspended">Askıda</option>
          </Select>
        </div>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-wider text-[color:var(--fg-muted)]">
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Ülke</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">KYC</th>
                <th className="px-4 py-3">Son Görülme</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-[color:var(--bg-card-hover)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar && <img src={u.avatar} alt="" className="size-9 rounded-full object-cover" />}
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          {u.name}
                          {u.premium && <Crown size={12} className="text-gold-300" />}
                        </div>
                        <div className="text-[11px] text-[color:var(--fg-muted)]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={u.role.includes('admin') ? 'gold' : u.role === 'agent' ? 'ai' : 'outline'}>{u.role}</Badge></td>
                  <td className="px-4 py-3 text-xs">{u.country === 'TR' ? '🇹🇷 Türkiye' : u.country === 'AZ' ? '🇦🇿 Azərbaycan' : '🌍 —'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 text-xs',
                      u.status === 'active' && 'text-success',
                      u.status === 'suspended' && 'text-danger',
                      u.status === 'pending' && 'text-gold-300',
                    )}>
                      <span className={cn('size-1.5 rounded-full',
                        u.status === 'active' && 'bg-success',
                        u.status === 'suspended' && 'bg-danger',
                        u.status === 'pending' && 'bg-gold-400',
                      )} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Badge variant={KYC_BADGE[u.kyc].v}>{KYC_BADGE[u.kyc].l}</Badge></td>
                  <td className="px-4 py-3 text-xs text-[color:var(--fg-muted)]">{timeAgo(u.lastSeen)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <a href={`mailto:${u.email}`}>
                        <Button variant="ghost" size="icon" className="size-8"><Mail size={13} /></Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn('size-8', u.status === 'suspended' ? 'text-success hover:bg-success/10' : 'text-danger hover:bg-danger/10')}
                        onClick={() => toggleStatus(u)}
                        loading={working === u.id}
                        title={u.status === 'suspended' ? 'Tekrar aktif et' : 'Askıya al'}
                      >
                        {u.status === 'suspended' ? <BadgeCheck size={13} /> : <Ban size={13} />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
