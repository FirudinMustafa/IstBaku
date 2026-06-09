'use client';

import * as React from 'react';
import { Plus, UserX, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { createPublisherAction, revokePublisherAction } from '@/lib/publisher-actions';

interface Publisher {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export function PublishersClient({ initial }: { initial: Publisher[] }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [publishers, setPublishers] = React.useState(initial);
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createPublisherAction({ name, email });
    setLoading(false);
    if (!res.ok) {
      toast({ variant: 'error', title: res.error });
      return;
    }
    toast({ variant: 'success', title: t('admin.publishers.toast.created'), description: t('admin.publishers.toast.createdDesc').replace('{email}', email) });
    setPublishers((prev) => [
      { id: res.id, name, email, role: 'blog_publisher', status: 'active', createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setName('');
    setEmail('');
    setShowForm(false);
  }

  async function handleRevoke(id: string) {
    const res = await revokePublisherAction(id);
    if (!res.ok) {
      toast({ variant: 'error', title: (res as { error: string }).error });
      return;
    }
    toast({ variant: 'success', title: t('admin.publishers.toast.revoked') });
    setPublishers((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper size={22} /> {t('admin.publishers.title')}
          </h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            {t('admin.publishers.subtitle')}
          </p>
        </div>
        <Button variant="gold" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={14} /> {t('admin.publishers.invite')}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border bg-[color:var(--bg-card)] space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('admin.publishers.fName')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('admin.publishers.fNamePh')} required />
            </div>
            <div>
              <Label>{t('admin.publishers.fEmail')}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@portal.com" required />
            </div>
          </div>
          <p className="text-xs text-[color:var(--fg-muted)]">
            {t('admin.publishers.formHint')}
          </p>
          <div className="flex gap-2">
            <Button type="submit" variant="gold" size="sm" disabled={loading}>
              {loading ? t('admin.publishers.creating') : t('admin.publishers.createInvite')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      )}

      {publishers.length === 0 ? (
        <div className="text-center py-12 text-[color:var(--fg-muted)]">
          {t('admin.publishers.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-[color:var(--fg-muted)]">
                <th className="pb-2 font-medium">{t('admin.publishers.fName')}</th>
                <th className="pb-2 font-medium">{t('admin.publishers.fEmail')}</th>
                <th className="pb-2 font-medium">{t('common.status')}</th>
                <th className="pb-2 font-medium">{t('admin.publishers.th.registeredAt')}</th>
                <th className="pb-2 font-medium text-right">{t('admin.publishers.th.action')}</th>
              </tr>
            </thead>
            <tbody>
              {publishers.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-[color:var(--fg-muted)]">{p.email}</td>
                  <td className="py-3">
                    <Badge variant={p.status === 'active' ? 'success' : 'default'}>
                      {p.status === 'active' ? t('common.active') : p.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-[color:var(--fg-muted)]">
                    {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-danger border-danger/30 hover:bg-danger/10"
                      onClick={() => handleRevoke(p.id)}
                    >
                      <UserX size={13} /> {t('admin.publishers.revoke')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
