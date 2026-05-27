'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Save, EyeOff, Newspaper, Clock, ImagePlus, X as XIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  createBlogPostAction,
  updateBlogPostAction,
} from '@/lib/blog-actions';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  authorName: string;
  category: 'news' | 'market' | 'guide' | 'partner';
  tags: string[];
  language: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type FormData = {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: 'news' | 'market' | 'guide' | 'partner';
  tagsRaw: string;
  language: string;
};

const CATEGORY_LABELS: Record<string, { l: string; v: 'gold' | 'success' | 'navy' | 'ai' }> = {
  news: { l: 'Haber', v: 'gold' },
  market: { l: 'Piyasa', v: 'navy' },
  guide: { l: 'Rehber', v: 'success' },
  partner: { l: 'Partner', v: 'ai' },
};

const EMPTY_FORM: FormData = {
  title: '', excerpt: '', content: '', coverImage: '',
  category: 'news', tagsRaw: '', language: 'tr',
};

/* ------------------------------------------------------------------ */
/* Publisher Form (isolated for fast typing)                           */
/* ------------------------------------------------------------------ */

function PublisherForm({ editingId, initialForm, onClose, onSaved }: {
  editingId: string | null;
  initialForm: FormData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<FormData>(initialForm);
  const [working, setWorking] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function patch<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/blog/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Yükleme başarısız.');
      patch('coverImage', json.url);
      toast({ variant: 'success', title: 'Görsel yüklendi' });
    } catch (err: unknown) {
      toast({ variant: 'error', title: err instanceof Error ? err.message : 'Yükleme hatası' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: 'Başlık gerekli' });
      return;
    }
    setWorking(true);
    const payload = {
      title: form.title, excerpt: form.excerpt, content: form.content,
      coverImage: form.coverImage, category: form.category,
      tags: form.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      language: form.language, published: false,
    };
    const res = editingId
      ? await updateBlogPostAction(editingId, payload)
      : await createBlogPostAction(payload);
    setWorking(false);
    if (res.ok) {
      toast({ variant: 'success', title: editingId ? 'Yazı güncellendi' : 'Yazı oluşturuldu — admin onayı bekleniyor' });
      onSaved();
    } else {
      toast({ variant: 'error', title: 'Hata', description: (res as { error: string }).error });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Başlık *</Label>
        <Input value={form.title} onChange={(e) => patch('title', e.target.value)} placeholder="Yazı başlığı" />
      </div>
      <div>
        <Label>Özet</Label>
        <Textarea rows={2} value={form.excerpt} onChange={(e) => patch('excerpt', e.target.value)} placeholder="Kısa açıklama" />
      </div>
      <div>
        <Label>İçerik</Label>
        <Textarea rows={10} value={form.content} onChange={(e) => patch('content', e.target.value)} placeholder="Yazı içeriği" className="font-mono text-sm" />
      </div>
      <div>
        <Label>Kapak Görseli</Label>
        {form.coverImage ? (
          <div className="relative w-full max-w-xs">
            <img src={form.coverImage} alt="Kapak" className="rounded-lg border object-cover w-full aspect-video" />
            <button type="button" onClick={() => patch('coverImage', '')} className="absolute top-1 right-1 size-6 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger/80">
              <XIcon size={12} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-[color:var(--fg-muted)] hover:border-gold-400/60 hover:text-gold-300 transition-colors">
            <ImagePlus size={24} />
            <span className="text-sm font-medium">{uploading ? 'Yükleniyor…' : 'Görsel Seç'}</span>
            <span className="text-xs">JPG, PNG, WebP — maks 5 MB</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleFileUpload} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Kategori</Label>
          <Select value={form.category} onChange={(e) => patch('category', e.target.value as FormData['category'])}>
            <option value="news">Haber</option>
            <option value="market">Piyasa</option>
            <option value="guide">Rehber</option>
            <option value="partner">Partner</option>
          </Select>
        </div>
        <div>
          <Label>Dil</Label>
          <Select value={form.language} onChange={(e) => patch('language', e.target.value)}>
            <option value="tr">Türkçe</option>
            <option value="az">Azərbaycan</option>
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Etiketler</Label>
        <Input value={form.tagsRaw} onChange={(e) => patch('tagsRaw', e.target.value)} placeholder="emlak, istanbul, yatırım (virgülle ayırın)" />
      </div>
      <div className="flex items-center gap-2 py-2 text-sm text-[color:var(--fg-muted)]">
        <EyeOff size={14} />
        Yazınız oluşturulduktan sonra admin onayına gönderilecektir.
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button variant="gold" onClick={handleSave} loading={working}>
          <Save size={14} /> {editingId ? 'Güncelle' : 'Gönder'}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export function PublisherBlogClient({ initial }: { initial: BlogPost[] }) {
  const router = useRouter();
  const [posts] = React.useState<BlogPost[]>(initial);
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [initialForm, setInitialForm] = React.useState<FormData>(EMPTY_FORM);

  function openCreate() {
    setEditingId(null);
    setInitialForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(p: BlogPost) {
    setEditingId(p.id);
    setInitialForm({
      title: p.title, excerpt: p.excerpt, content: p.content,
      coverImage: p.coverImage ?? '', category: p.category,
      tagsRaw: p.tags.join(', '), language: p.language,
    });
    setOpen(true);
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yazılarım</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            Yazdığınız blog yazıları burada listelenir. Yeni yazılar admin onayından sonra yayına alınır.
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          <Plus size={14} /> Yeni Yazı
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-[color:var(--fg-muted)]">
            <Newspaper size={32} className="mx-auto text-gold-300" />
            <p className="mt-3 font-medium">Henüz yazınız yok</p>
            <p className="text-xs mt-1">İlk yazınızı oluşturmak için butona tıklayın.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const cat = CATEGORY_LABELS[p.category] ?? { l: p.category, v: 'gold' as const };
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardBody className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={cat.v}>{cat.l}</Badge>
                      {p.published ? (
                        <Badge variant="success">Yayında</Badge>
                      ) : (
                        <Badge variant="default" className="gap-1"><Clock size={10} /> Onay Bekliyor</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <p className="text-xs text-[color:var(--fg-muted)] mt-1 line-clamp-1">{p.excerpt}</p>
                    <div className="text-[11px] text-[color:var(--fg-faint)] mt-2">
                      Oluşturulma: {fmtDate(p.createdAt)} · Yayın: {fmtDate(p.publishedAt)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => openEdit(p)}>
                    <Pencil size={12} /> Düzenle
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? 'Yazıyı Düzenle' : 'Yeni Yazı'} size="xl">
        {open && (
          <PublisherForm
            editingId={editingId}
            initialForm={initialForm}
            onClose={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              setEditingId(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
