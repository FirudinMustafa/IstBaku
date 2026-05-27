'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Property } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { updateListingAction, deleteListingAction } from '@/lib/listing-actions';

export function EditListingForm({ initial }: { initial: Property }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initial.title);
  const [description, setDescription] = React.useState(initial.description);
  const [price, setPrice] = React.useState(initial.price);
  const [currency, setCurrency] = React.useState(initial.currency);
  const [status, setStatus] = React.useState(initial.status);
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  // PF-07: when the server action reports `requeued: true`, render an inline
  // banner alongside the toast so the user understands their listing is no
  // longer publicly visible until a moderator approves the change.
  const [requeued, setRequeued] = React.useState(false);

  async function save() {
    setSaving(true);
    setRequeued(false);
    const res = await updateListingAction({
      id: initial.id,
      title, description, price, currency, status,
    });
    setSaving(false);
    if (res.ok) {
      if (res.requeued) {
        // PF-07: priority signal — keep the user on the edit page just long
        // enough to read the banner, then redirect. Toast gives the immediate
        // audible/visual cue; banner persists in the URL re-navigation.
        setRequeued(true);
        toast({
          // PF-07: 'info' is the closest available variant — the Toast
          // primitive only supports success/error/info today; the inline
          // banner carries the warning emphasis.
          variant: 'info',
          title: 'Tekrar onaya gönderildi',
          description: 'Düzenleme onaylanana kadar listede güncel haliyle görünmeyecek.',
        });
        setTimeout(() => router.push(`/property/${initial.slug}`), 1800);
      } else {
        toast({ variant: 'success', title: 'Kaydedildi', description: 'İlan güncellendi.' });
        setTimeout(() => router.push(`/property/${initial.slug}`), 600);
      }
    } else {
      toast({ variant: 'error', title: 'Hata', description: res.error });
    }
  }

  async function doDelete() {
    setDeleting(true);
    const res = await deleteListingAction(initial.id);
    setDeleting(false);
    if (res.ok) {
      toast({ variant: 'success', title: 'Silindi' });
      router.push('/dashboard?tab=listings');
    } else {
      toast({ variant: 'error', title: 'Silinemedi', description: res.error });
      setDeleteOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24">
      <Link href={`/property/${initial.slug}`} className="inline-flex items-center gap-1 text-sm text-[color:var(--fg-muted)] hover:text-gold-300 mb-4">
        <ArrowLeft size={14} /> İlana dön
      </Link>
      <Badge variant="ai">İlan Düzenle</Badge>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">{initial.title}</h1>
      <p className="text-sm text-[color:var(--fg-muted)] mt-1">{initial.city} · {initial.district}</p>

      {requeued && (
        <div
          role="alert"
          data-testid="requeue-banner"
          className="mt-4 rounded-xl border border-gold-400/40 bg-gold-400/10 text-gold-300 px-4 py-3 flex items-start gap-3 text-sm"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <strong>Düzenleme tekrar onaya gönderildi.</strong>{' '}
            Onaylanana kadar listede güncel haliyle görünmeyecek.
          </div>
        </div>
      )}

      <Card className="mt-6">
        <CardBody className="p-5 sm:p-7 space-y-4">
          <div>
            <Label>Başlık</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Fiyat</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} min={0} />
            </div>
            <div>
              <Label>Para birimi</Label>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value as Property['currency'])}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
                <option value="AZN">AZN</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Durum</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as Property['status'])}>
                <option value="bos">Boş</option>
                <option value="kiracili">Kiracılı</option>
                <option value="mulk_sahibi">Mülk sahibi oturuyor</option>
              </Select>
            </div>
          </div>

          <div className="text-xs text-[color:var(--fg-muted)] pt-2 border-t">
            💡 Foto, konum, oda sayısı gibi yapısal alanları değiştirmek için ilanı silip yeniden ver.
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          className="text-danger hover:bg-danger/10 gap-1.5"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={14} /> İlanı Sil
        </Button>
        <div className="flex gap-2">
          <Link href={`/property/${initial.slug}`}>
            <Button variant="outline" size="lg">İptal</Button>
          </Link>
          <Button variant="gold" size="lg" onClick={save} loading={saving}>
            <Save size={15} /> Kaydet
          </Button>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="İlanı silmek istediğine emin misin?">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-10 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <p className="text-sm text-[color:var(--fg-muted)]">
            Bu işlem geri alınamaz. <strong className="text-[color:var(--fg)]">{initial.title}</strong> ilanı kalıcı olarak silinecek.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>İptal</Button>
          <Button variant="danger" onClick={doDelete} loading={deleting}>
            <Trash2 size={14} /> Evet, Sil
          </Button>
        </div>
      </Modal>
    </div>
  );
}
