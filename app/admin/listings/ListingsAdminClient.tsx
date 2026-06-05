'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Trash2, ExternalLink, Building2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/currency';
import { formatListingNumber } from '@/lib/listing-number';
import { deleteListingAction } from '@/lib/listing-actions';
import type { Currency } from '@/lib/types';

interface Row {
  id: string;
  listingNumber: number;
  slug: string;
  title: string;
  city: string;
  district: string;
  price: number;
  currency: Currency;
  approvalStatus: string;
  image: string;
  agentName: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { v: 'success' | 'gold' | 'danger' | 'outline'; l: string }> = {
  approved: { v: 'success', l: 'Onaylı' },
  pending: { v: 'gold', l: 'Bekliyor' },
  rejected: { v: 'danger', l: 'Reddedildi' },
};

export function ListingsAdminClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Row[]>(initial);
  const [q, setQ] = React.useState('');
  const [deleteFor, setDeleteFor] = React.useState<Row | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return rows;
    const digits = ql.replace(/^#/, '');
    return rows.filter((r) =>
      formatListingNumber(r.listingNumber).includes(digits) ||
      r.title.toLowerCase().includes(ql) ||
      r.city.toLowerCase().includes(ql) ||
      r.district.toLowerCase().includes(ql) ||
      r.agentName.toLowerCase().includes(ql),
    );
  }, [rows, q]);

  async function doDelete() {
    if (!deleteFor) return;
    setDeleting(true);
    const res = await deleteListingAction(deleteFor.id);
    setDeleting(false);
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== deleteFor.id));
      toast({ variant: 'success', title: 'İlan silindi', description: `#${formatListingNumber(deleteFor.listingNumber)} kaldırıldı.` });
      setDeleteFor(null);
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Silinemedi', description: res.error });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><Building2 size={20} className="text-gold-300" /> İlanlar</h1>
        <span className="text-sm text-[color:var(--fg-muted)]">{filtered.length} / {rows.length} ilan</span>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İlan no, başlık, şehir veya ofis ara…"
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-[color:var(--bg-card)] border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
        />
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[color:var(--fg-muted)] border-b">
              <tr>
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">İlan</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Konum</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Ofis/Ajan</th>
                <th className="px-4 py-3 font-medium">Fiyat</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const st = STATUS_BADGE[r.approvalStatus] ?? { v: 'outline' as const, l: r.approvalStatus };
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-[color:var(--bg-card-hover)]">
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">#{formatListingNumber(r.listingNumber)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.image || '/brand/mark-navy.png'} alt="" className="size-10 rounded-lg object-cover bg-[color:var(--bg-elev)]" />
                        <span className="font-medium line-clamp-1">{r.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--fg-muted)] hidden md:table-cell whitespace-nowrap">{r.city} / {r.district}</td>
                    <td className="px-4 py-3 text-[color:var(--fg-muted)] hidden lg:table-cell whitespace-nowrap">{r.agentName}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatPrice(r.price, r.currency)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Badge variant={st.v}>{st.l}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/property/${formatListingNumber(r.listingNumber)}`} target="_blank" aria-label="İlanı aç"
                          className="size-9 rounded-lg border flex items-center justify-center hover:border-[color:var(--border-strong)]">
                          <ExternalLink size={14} />
                        </Link>
                        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => setDeleteFor(r)}>
                          <Trash2 size={14} /> Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[color:var(--fg-muted)]">Sonuç yok.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Modal open={!!deleteFor} onClose={() => (deleting ? undefined : setDeleteFor(null))} title="İlanı sil" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--fg-muted)]">
            <strong className="text-[color:var(--fg)] font-mono">#{deleteFor ? formatListingNumber(deleteFor.listingNumber) : ''}</strong> — “{deleteFor?.title}” ilanını silmek istediğine emin misin? Bu işlem ilanı yayından kaldırır.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteFor(null)} disabled={deleting}>Vazgeç</Button>
            <Button variant="danger" onClick={doDelete} loading={deleting}><Trash2 size={14} /> Evet, sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
