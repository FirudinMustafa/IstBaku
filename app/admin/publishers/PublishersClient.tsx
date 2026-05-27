'use client';

import * as React from 'react';
import { Plus, UserX, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
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
    toast({ variant: 'success', title: 'Yayıncı oluşturuldu', description: `Giriş bilgileri ${email} adresine gönderildi.` });
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
    toast({ variant: 'success', title: 'Yayıncı yetkisi kaldırıldı' });
    setPublishers((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper size={22} /> Blog Yayıncıları
          </h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            Dış haber portalları ve blog yayıncılarının hesaplarını yönetin.
          </p>
        </div>
        <Button variant="gold" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Yayıncı Davet Et
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border bg-[color:var(--bg-card)] space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>İsim</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Yayıncı adı" required />
            </div>
            <div>
              <Label>E-posta</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@portal.com" required />
            </div>
          </div>
          <p className="text-xs text-[color:var(--fg-muted)]">
            Geçici şifre otomatik oluşturulup e-posta ile gönderilecek. Yayıncı, blog panelinden kendi yazılarını paylaşabilecek ancak yayınlama admin onayına tabi olacak.
          </p>
          <div className="flex gap-2">
            <Button type="submit" variant="gold" size="sm" disabled={loading}>
              {loading ? 'Oluşturuluyor…' : 'Oluştur ve Davet Gönder'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </form>
      )}

      {publishers.length === 0 ? (
        <div className="text-center py-12 text-[color:var(--fg-muted)]">
          Henüz yayıncı yok. &quot;Yayıncı Davet Et&quot; ile ilk yayıncıyı ekleyin.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-[color:var(--fg-muted)]">
                <th className="pb-2 font-medium">İsim</th>
                <th className="pb-2 font-medium">E-posta</th>
                <th className="pb-2 font-medium">Durum</th>
                <th className="pb-2 font-medium">Kayıt Tarihi</th>
                <th className="pb-2 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {publishers.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-[color:var(--fg-muted)]">{p.email}</td>
                  <td className="py-3">
                    <Badge variant={p.status === 'active' ? 'success' : 'default'}>
                      {p.status === 'active' ? 'Aktif' : p.status}
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
                      <UserX size={13} /> Yetkiyi Kaldır
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
