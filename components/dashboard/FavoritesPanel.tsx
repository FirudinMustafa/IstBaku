'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Plus, Pencil, Trash2, FolderInput } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ListingCard } from '@/components/listings/ListingCard';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import {
  getMyCollectionsAction, createCollectionAction, renameCollectionAction,
  deleteCollectionAction, setFavoriteCollectionAction, type FavCollection,
} from '@/lib/favorite-actions';
import type { Property } from '@/lib/types';

type Fav = Property & { collectionId: string | null };

export function FavoritesPanel({ favorites }: { favorites: Fav[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const [collections, setCollections] = React.useState<FavCollection[]>([]);
  const [active, setActive] = React.useState<string>('all'); // 'all' | collectionId
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    setCollections(await getMyCollectionsAction());
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const shown = active === 'all' ? favorites : favorites.filter((f) => f.collectionId === active);

  async function addTab() {
    const name = window.prompt(t('fav.newTabPrompt'));
    if (!name) return;
    setBusy(true);
    const res = await createCollectionAction(name);
    setBusy(false);
    if (res.ok) { await reload(); toast({ variant: 'success', title: t('fav.tabCreated') }); }
    else toast({ variant: 'error', title: t('common.error'), description: res.error });
  }

  async function renameTab(c: FavCollection) {
    const name = window.prompt(t('fav.renameTabPrompt'), c.name);
    if (!name || name === c.name) return;
    const res = await renameCollectionAction(c.id, name);
    if (res.ok) { await reload(); } else toast({ variant: 'error', title: t('common.error'), description: res.error });
  }

  async function deleteTab(c: FavCollection) {
    if (!window.confirm(t('fav.deleteTabConfirm').replace('{name}', c.name))) return;
    const res = await deleteCollectionAction(c.id);
    if (res.ok) { if (active === c.id) setActive('all'); await reload(); router.refresh(); }
  }

  async function moveTo(listingId: string, collectionId: string | null) {
    const res = await setFavoriteCollectionAction(listingId, collectionId);
    if (res.ok) { await reload(); router.refresh(); toast({ variant: 'success', title: t('fav.moved') }); }
    else toast({ variant: 'error', title: t('common.error') });
  }

  if (favorites.length === 0) {
    return (
      <Card><CardBody className="text-center py-12">
        <Heart size={28} className="text-danger mx-auto" />
        <h3 className="mt-3 text-lg font-semibold">{t('dash.fav.emptyTitle')}</h3>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{t('dash.fav.emptyDesc')}</p>
        <Link href="/listings"><Button variant="gold" size="md" className="mt-5">{t('dash.fav.emptyButton')}</Button></Link>
      </CardBody></Card>
    );
  }

  return (
    <div>
      {/* Koleksiyon sekmeleri (sahibinden tarzı) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActive('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-sm border whitespace-nowrap ${active === 'all' ? 'bg-gold-400/15 border-gold-400/40 text-gold-300' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-card-hover)]'}`}
        >
          {t('fav.all')} <span className="text-xs opacity-70">{favorites.length}</span>
        </button>
        {collections.map((c) => (
          <span key={c.id} className={`shrink-0 inline-flex items-center gap-1 rounded-xl border ${active === c.id ? 'bg-gold-400/15 border-gold-400/40 text-gold-300' : 'border-[color:var(--border)]'}`}>
            <button onClick={() => setActive(c.id)} className="pl-3 pr-1 py-1.5 text-sm whitespace-nowrap">
              {c.name} <span className="text-xs opacity-70">{c.count}</span>
            </button>
            <button onClick={() => renameTab(c)} aria-label={t('fav.rename')} className="p-1 opacity-60 hover:opacity-100"><Pencil size={12} /></button>
            <button onClick={() => deleteTab(c)} aria-label={t('fav.delete')} className="p-1 pr-2 opacity-60 hover:opacity-100 hover:text-danger"><Trash2 size={12} /></button>
          </span>
        ))}
        <Button variant="outline" size="sm" onClick={addTab} loading={busy} className="shrink-0"><Plus size={14} /> {t('fav.newTab')}</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((p) => (
          <div key={p.id} className="space-y-1.5">
            <ListingCard property={p} compact />
            {/* Koleksiyona taşı */}
            <div className="flex items-center gap-1.5 text-xs text-[color:var(--fg-muted)] px-1">
              <FolderInput size={13} className="shrink-0" />
              <select
                value={p.collectionId ?? ''}
                onChange={(e) => moveTo(p.id, e.target.value || null)}
                className="flex-1 min-w-0 bg-transparent border border-[color:var(--border)] rounded-lg px-2 py-1"
              >
                <option value="">{t('fav.all')}</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-[color:var(--fg-muted)]">{t('fav.emptyTab')}</div>
        )}
      </div>
    </div>
  );
}
