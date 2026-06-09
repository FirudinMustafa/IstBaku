'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Save, EyeOff, Newspaper, Clock, ImagePlus, Video, X as XIcon } from 'lucide-react';
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
import { useLang } from '@/components/layout/LangProvider';

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

const CATEGORY_META: Record<string, { tk: string; v: 'gold' | 'success' | 'navy' | 'ai' }> = {
  news: { tk: 'blog.cat.newsSingular', v: 'gold' },
  market: { tk: 'blog.cat.market', v: 'navy' },
  guide: { tk: 'blog.cat.guide', v: 'success' },
  partner: { tk: 'blog.cat.partner', v: 'ai' },
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
  const { t } = useLang();
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
      if (!res.ok) throw new Error(json.error || t('blog.pub.toast.uploadFail'));
      patch('coverImage', json.url);
      toast({ variant: 'success', title: t('blog.pub.toast.uploaded') });
    } catch (err: unknown) {
      toast({ variant: 'error', title: err instanceof Error ? err.message : t('blog.pub.toast.uploadErr') });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // Tur6 #4e: içeriğe gömülü görsel
  const contentImgRef = React.useRef<HTMLInputElement>(null);
  const [insertingImg, setInsertingImg] = React.useState(false);

  async function insertContentImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (contentImgRef.current) contentImgRef.current.value = '';
    if (!file) return;
    setInsertingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/blog/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('blog.pub.toast.uploadFail'));
      patch('content', `${form.content}\n<figure><img src="${json.url}" alt="" /></figure>\n`);
      toast({ variant: 'success', title: t('blog.pub.toast.uploaded') });
    } catch (err: unknown) {
      toast({ variant: 'error', title: err instanceof Error ? err.message : t('blog.pub.toast.uploadErr') });
    } finally {
      setInsertingImg(false);
    }
  }

  // YouTube/Vimeo URL → güvenli gömülü iframe (yalnızca bu sağlayıcılar)
  function toEmbed(url: string): string | null {
    try {
      const u = new URL(url.trim());
      const host = u.hostname.replace(/^www\./, '');
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      }
      if (host === 'youtu.be') {
        const id = u.pathname.slice(1);
        if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      }
      if (host === 'vimeo.com') {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
      }
    } catch { /* geçersiz URL */ }
    return null;
  }

  function insertContentVideo() {
    const url = window.prompt(t('blog.pub.videoPrompt'));
    if (!url) return;
    const embed = toEmbed(url);
    if (!embed) { toast({ variant: 'error', title: t('blog.pub.videoInvalid') }); return; }
    patch('content', `${form.content}\n<figure><iframe src="${embed}" width="560" height="315" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>\n`);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: t('blog.pub.toast.titleRequired') });
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
      toast({ variant: 'success', title: editingId ? t('blog.pub.toast.updated') : t('blog.pub.toast.created') });
      onSaved();
    } else {
      toast({ variant: 'error', title: t('blog.pub.toast.error'), description: (res as { error: string }).error });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('blog.pub.heading')}</Label>
        <Input value={form.title} onChange={(e) => patch('title', e.target.value)} placeholder={t('blog.pub.headingPh')} />
      </div>
      <div>
        <Label>{t('blog.pub.excerpt')}</Label>
        <Textarea rows={2} value={form.excerpt} onChange={(e) => patch('excerpt', e.target.value)} placeholder={t('blog.pub.excerptPh')} />
      </div>
      <div>
        <Label>{t('blog.pub.content')}</Label>
        {/* Tur6 #4e: metin + gömülü foto/video */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Button type="button" variant="outline" size="sm" onClick={() => contentImgRef.current?.click()} disabled={insertingImg}>
            <ImagePlus size={14} /> {insertingImg ? t('common.loading') : t('blog.pub.addImage')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={insertContentVideo}>
            <Video size={14} /> {t('blog.pub.addVideo')}
          </Button>
          <input ref={contentImgRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={insertContentImage} />
        </div>
        <Textarea rows={10} value={form.content} onChange={(e) => patch('content', e.target.value)} placeholder={t('blog.pub.contentPh')} className="font-mono text-sm" />
        <p className="mt-1 text-xs text-[color:var(--fg-muted)]">{t('blog.pub.contentHint')}</p>
      </div>
      <div>
        <Label>{t('blog.pub.cover')}</Label>
        {form.coverImage ? (
          <div className="relative w-full max-w-xs">
            <img src={form.coverImage} alt={t('blog.pub.coverAlt')} className="rounded-lg border object-cover w-full aspect-video" />
            <button type="button" onClick={() => patch('coverImage', '')} className="absolute top-1 right-1 size-6 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger/80">
              <XIcon size={12} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-[color:var(--fg-muted)] hover:border-gold-400/60 hover:text-gold-300 transition-colors">
            <ImagePlus size={24} />
            <span className="text-sm font-medium">{uploading ? t('common.loading') : t('blog.pub.pickImage')}</span>
            <span className="text-xs">{t('blog.pub.imageHint')}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleFileUpload} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>{t('blog.pub.category')}</Label>
          <Select value={form.category} onChange={(e) => patch('category', e.target.value as FormData['category'])}>
            <option value="news">{t('blog.cat.newsSingular')}</option>
            <option value="market">{t('blog.cat.market')}</option>
            <option value="guide">{t('blog.cat.guide')}</option>
            <option value="partner">{t('blog.cat.partner')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('blog.pub.language')}</Label>
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
        <Label>{t('blog.pub.tags')}</Label>
        <Input value={form.tagsRaw} onChange={(e) => patch('tagsRaw', e.target.value)} placeholder={t('blog.pub.tagsPh')} />
      </div>
      <div className="flex items-center gap-2 py-2 text-sm text-[color:var(--fg-muted)]">
        <EyeOff size={14} />
        {t('blog.pub.approvalNote')}
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="ghost" onClick={onClose}>{t('blog.pub.cancel')}</Button>
        <Button variant="gold" onClick={handleSave} loading={working}>
          <Save size={14} /> {editingId ? t('blog.pub.update') : t('blog.pub.send')}
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
  const { t } = useLang();
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
          <h1 className="text-2xl font-bold tracking-tight">{t('blog.pub.title')}</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            {t('blog.pub.subtitle')}
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          <Plus size={14} /> {t('blog.pub.new')}
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-[color:var(--fg-muted)]">
            <Newspaper size={32} className="mx-auto text-gold-300" />
            <p className="mt-3 font-medium">{t('blog.pub.empty.title')}</p>
            <p className="text-xs mt-1">{t('blog.pub.empty.body')}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const cat = CATEGORY_META[p.category] ?? { tk: '', v: 'gold' as const };
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardBody className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={cat.v}>{cat.tk ? t(cat.tk) : p.category}</Badge>
                      {p.published ? (
                        <Badge variant="success">{t('blog.pub.published')}</Badge>
                      ) : (
                        <Badge variant="default" className="gap-1"><Clock size={10} /> {t('blog.pub.pending')}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <p className="text-xs text-[color:var(--fg-muted)] mt-1 line-clamp-1">{p.excerpt}</p>
                    <div className="text-[11px] text-[color:var(--fg-faint)] mt-2">
                      {t('blog.pub.created')} {fmtDate(p.createdAt)} · {t('blog.pub.publishLabel')} {fmtDate(p.publishedAt)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => openEdit(p)}>
                    <Pencil size={12} /> {t('blog.pub.edit')}
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? t('blog.pub.editTitle') : t('blog.pub.new')} size="xl">
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
