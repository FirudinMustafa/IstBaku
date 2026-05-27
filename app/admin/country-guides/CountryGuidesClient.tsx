'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, FileText, Plus, ExternalLink, Save } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { COUNTRY_CODES } from '@/lib/labels';
import { upsertGuideAction, deleteGuideAction } from '@/lib/guide-actions';

interface Guide {
  iso: string;
  name: string;
  flag: string;
  description: string;
  pdfUrl: string;
  pages: number;
  language: 'tr' | 'az' | 'en' | 'ru' | 'de' | 'zh';
  updatedAt: string;
}

export function CountryGuidesClient({ initial }: { initial: Guide[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [guides, setGuides] = React.useState<Guide[]>(initial);
  const [editing, setEditing] = React.useState<Guide | null>(null);
  const [open, setOpen] = React.useState(false);
  const [working, setWorking] = React.useState(false);

  function startCreate() {
    setEditing({
      iso: 'TR', name: 'Türkiye', flag: '🇹🇷',
      description: '', pdfUrl: '/api/country-guide?iso=TR',
      pages: 0, language: 'tr',
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  }

  function startEdit(g: Guide) { setEditing({ ...g }); setOpen(true); }

  async function save() {
    if (!editing) return;
    setWorking(true);
    const res = await upsertGuideAction({
      iso: editing.iso,
      name: editing.name,
      flag: editing.flag,
      description: editing.description,
      pdfUrl: editing.pdfUrl,
      pages: editing.pages,
      language: editing.language,
    });
    setWorking(false);
    if (res.ok) {
      const exists = guides.find((g) => g.iso === editing.iso);
      const next = exists
        ? guides.map((g) => g.iso === editing.iso ? editing : g)
        : [...guides, editing];
      setGuides(next);
      setOpen(false);
      setEditing(null);
      toast({ variant: 'success', title: exists ? 'Rehber güncellendi' : 'Rehber eklendi' });
      router.refresh();
    } else {
      toast({ variant: 'error', title: 'Kaydedilemedi', description: res.error });
    }
  }

  async function remove(iso: string) {
    if (!confirm(`${iso} rehberini sil?`)) return;
    const res = await deleteGuideAction(iso);
    if (res.ok) {
      setGuides((cur) => cur.filter((g) => g.iso !== iso));
      toast({ variant: 'info', title: 'Rehber silindi' });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ülke Rehberleri</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">Ana sayfada gözüken PDF rehberlerini buradan yönetirsin.</p>
        </div>
        <Button variant="gold" onClick={startCreate}><Plus size={14} /> Yeni Rehber</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.map((g) => (
          <Card key={g.iso}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-xl bg-gold-400/15 flex items-center justify-center text-2xl">{g.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-[color:var(--fg-muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="!text-[10px]">{g.iso}</Badge>
                    <span>{g.pages} sayfa</span>
                    <span>·</span>
                    <span className="uppercase">{g.language}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-[color:var(--fg-muted)] line-clamp-3">{g.description}</p>
              <div className="mt-3 text-[10px] text-[color:var(--fg-faint)]">Güncel: {g.updatedAt}</div>
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                <a href={g.pdfUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="w-full gap-1"><ExternalLink size={11} /></Button>
                </a>
                <Button variant="outline" size="sm" onClick={() => startEdit(g)}>Düzenle</Button>
                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => remove(g.iso)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing && guides.find((g) => g.iso === editing.iso) ? 'Rehberi Düzenle' : 'Yeni Rehber'} size="lg">
        {editing && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Ülke</Label>
                <Select
                  value={editing.iso}
                  onChange={(e) => {
                    const cc = COUNTRY_CODES.find((c) => c.iso === e.target.value);
                    if (cc) setEditing({ ...editing, iso: cc.iso, name: cc.name, flag: cc.flag, pdfUrl: `/api/country-guide?iso=${cc.iso}` });
                  }}
                >
                  {COUNTRY_CODES.map((c) => <option key={c.iso} value={c.iso}>{c.flag} {c.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Dil</Label>
                <Select value={editing.language} onChange={(e) => setEditing({ ...editing, language: e.target.value as Guide['language'] })}>
                  <option value="tr">Türkçe</option>
                  <option value="az">Azərbaycan</option>
                  <option value="en">English</option>
                </Select>
              </div>
              <div>
                <Label>Sayfa sayısı</Label>
                <Input type="number" value={editing.pages} onChange={(e) => setEditing({ ...editing, pages: +e.target.value })} />
              </div>
              <div>
                <Label>Son güncelleme</Label>
                <Input type="date" value={editing.updatedAt} onChange={(e) => setEditing({ ...editing, updatedAt: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <Label>PDF URL (signed)</Label>
              <Input value={editing.pdfUrl} onChange={(e) => setEditing({ ...editing, pdfUrl: e.target.value })} placeholder="https://blob.vercel-storage.com/..." />
              <p className="text-[11px] text-[color:var(--fg-faint)] mt-1">Production: dosya yükle → Vercel Blob'a yaz → signed URL kaydet.</p>
            </div>

            <div className="rounded-xl border-2 border-dashed p-5 text-center bg-[color:var(--bg-elev)]">
              <FileText size={24} className="mx-auto text-gold-300" />
              <p className="text-sm mt-2 text-[color:var(--fg-muted)]">PDF Yükle (sürükle-bırak)</p>
              <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5">
                <Upload size={13} /> Dosya Seç
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
              <Button variant="gold" onClick={save} loading={working}><Save size={14} /> Kaydet</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
