'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Save, Eye, EyeOff, Newspaper, ImagePlus, X as XIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import {
  createBlogPostAction,
  updateBlogPostAction,
  deleteBlogPostAction,
} from '@/lib/blog-actions';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

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
  published: boolean;
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<string, { k: string; v: 'gold' | 'success' | 'navy' | 'ai' }> = {
  news: { k: 'admin.blog.cat.news', v: 'gold' },
  market: { k: 'admin.blog.cat.market', v: 'navy' },
  guide: { k: 'admin.blog.cat.guide', v: 'success' },
  partner: { k: 'admin.blog.cat.partner', v: 'ai' },
};

const EMPTY_FORM: FormData = {
  title: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: 'news',
  tagsRaw: '',
  language: 'tr',
  published: false,
};

/* ------------------------------------------------------------------ */
/* Blog Form (isolated to prevent table re-renders on keystrokes)      */
/* ------------------------------------------------------------------ */

function BlogForm({ editingId, initialForm, onClose, onSaved }: {
  editingId: string | null;
  initialForm: FormData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
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
      if (!res.ok) throw new Error(json.error || t('admin.blog.toast.uploadFail'));
      patch('coverImage', json.url);
      toast({ variant: 'success', title: t('admin.blog.toast.imageUploaded') });
    } catch (err: unknown) {
      toast({ variant: 'error', title: err instanceof Error ? err.message : t('admin.blog.toast.uploadError') });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: t('admin.blog.toast.titleRequired') });
      return;
    }
    setWorking(true);
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      category: form.category,
      tags: form.tagsRaw.split(',').map((tag) => tag.trim()).filter(Boolean),
      language: form.language,
      published: form.published,
    };

    const res = editingId
      ? await updateBlogPostAction(editingId, payload)
      : await createBlogPostAction(payload);

    setWorking(false);

    if (res.ok) {
      toast({ variant: 'success', title: editingId ? t('admin.blog.toast.postUpdated') : t('admin.blog.toast.postCreated') });
      onSaved();
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('admin.blog.fTitle')}</Label>
        <Input
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder={t('admin.blog.fTitlePh')}
        />
      </div>

      <div>
        <Label>{t('admin.blog.fExcerpt')}</Label>
        <Textarea
          rows={2}
          value={form.excerpt}
          onChange={(e) => patch('excerpt', e.target.value)}
          placeholder={t('admin.blog.fExcerptPh')}
        />
      </div>

      <div>
        <Label>{t('admin.blog.fContent')}</Label>
        <Textarea
          rows={12}
          value={form.content}
          onChange={(e) => patch('content', e.target.value)}
          placeholder={t('admin.blog.fContentPh')}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <Label>{t('admin.blog.fCover')}</Label>
        {form.coverImage ? (
          <div className="relative w-full max-w-xs">
            <img src={form.coverImage} alt={t('admin.blog.coverAlt')} className="rounded-lg border object-cover w-full aspect-video" />
            <button
              type="button"
              onClick={() => patch('coverImage', '')}
              className="absolute top-1 right-1 size-6 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger/80"
            >
              <XIcon size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-[color:var(--fg-muted)] hover:border-gold-400/60 hover:text-gold-300 transition-colors"
          >
            <ImagePlus size={24} />
            <span className="text-sm font-medium">{uploading ? t('common.loading') : t('admin.blog.pickImage')}</span>
            <span className="text-xs">{t('admin.blog.imageHint')}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleFileUpload} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>{t('admin.blog.fCategory')}</Label>
          <Select
            value={form.category}
            onChange={(e) => patch('category', e.target.value as FormData['category'])}
          >
            <option value="news">{t('admin.blog.cat.news')}</option>
            <option value="market">{t('admin.blog.cat.market')}</option>
            <option value="guide">{t('admin.blog.cat.guide')}</option>
            <option value="partner">{t('admin.blog.cat.partner')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('admin.blog.fLanguage')}</Label>
          <Select
            value={form.language}
            onChange={(e) => patch('language', e.target.value)}
          >
            <option value="tr">{t('common.lang_tr')}</option>
            <option value="az">{t('common.lang_az')}</option>
            <option value="en">{t('common.lang_en')}</option>
            <option value="ru">{t('common.lang_ru')}</option>
            <option value="de">{t('common.lang_de')}</option>
            <option value="zh">{t('common.lang_zh')}</option>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t('admin.blog.fTags')}</Label>
        <Input
          value={form.tagsRaw}
          onChange={(e) => patch('tagsRaw', e.target.value)}
          placeholder={t('admin.blog.fTagsPh')}
        />
      </div>

      <div className="flex items-center gap-3 py-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch('published', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[color:var(--bg-elev)] border rounded-full peer peer-checked:bg-success peer-checked:border-success transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
        <span className="text-sm flex items-center gap-1.5">
          {form.published ? (
            <><Eye size={14} className="text-success" /> {t('status.published')}</>
          ) : (
            <><EyeOff size={14} className="text-[color:var(--fg-muted)]" /> {t('status.draft')}</>
          )}
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="gold" onClick={handleSave} loading={working}>
          <Save size={14} /> {editingId ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export function BlogClient({ initial }: { initial: BlogPost[] }) {
  const router = useRouter();
  const { t } = useLang();
  const { toast } = useToast();
  const [posts, setPosts] = React.useState<BlogPost[]>(initial);
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
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.coverImage ?? '',
      category: p.category,
      tagsRaw: p.tags.join(', '),
      language: p.language,
      published: p.published,
    });
    setOpen(true);
  }

  async function handleDelete(p: BlogPost) {
    if (!confirm(t('admin.blog.confirmDelete').replace('{title}', p.title))) return;
    const res = await deleteBlogPostAction(p.id);
    if (res.ok) {
      setPosts((cur) => cur.filter((x) => x.id !== p.id));
      toast({ variant: 'info', title: t('admin.blog.toast.deleted') });
      router.refresh();
    } else {
      toast({ variant: 'error', title: t('admin.blog.toast.deleteFail'), description: res.error });
    }
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /* -- render -- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.blog.title')}</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            {t('admin.blog.subtitle')}
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          <Plus size={14} /> {t('admin.blog.newPost')}
        </Button>
      </div>

      {/* Posts table */}
      {posts.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-[color:var(--fg-muted)]">
            <Newspaper size={32} className="mx-auto text-gold-300" />
            <p className="mt-3 font-medium">{t('admin.blog.empty')}</p>
            <p className="text-xs mt-1">{t('admin.blog.emptyHint')}</p>
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-[color:var(--fg-muted)]">
                  <th className="px-4 py-3 font-medium">{t('admin.blog.th.title')}</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">{t('admin.blog.th.category')}</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">{t('admin.blog.th.language')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.blog.th.status')}</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">{t('admin.blog.th.publishedAt')}</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">{t('admin.blog.th.author')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('admin.blog.th.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {posts.map((p) => {
                  const cat = CATEGORY_LABELS[p.category] ?? { k: '', v: 'gold' as const };
                  const catLabel = cat.k ? t(cat.k) : p.category;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[color:var(--bg-card-hover)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[280px]">{p.title}</div>
                        <div className="text-xs text-[color:var(--fg-faint)] truncate max-w-[280px] mt-0.5 sm:hidden">
                          {catLabel}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant={cat.v}>{catLabel}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs uppercase">{p.language}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${
                              p.published ? 'bg-success' : 'bg-[color:var(--fg-faint)]'
                            }`}
                          />
                          <span className="text-xs">
                            {p.published ? t('status.published') : t('status.draft')}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--fg-muted)] hidden lg:table-cell">
                        {fmtDate(p.publishedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--fg-muted)] hidden lg:table-cell truncate max-w-[140px]">
                        {p.authorName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(p)}
                            className="gap-1"
                          >
                            <Pencil size={12} /> {t('common.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-danger/10"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? t('admin.blog.editDialog') : t('admin.blog.newDialog')}
        size="xl"
      >
        {open && (
          <BlogForm
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
