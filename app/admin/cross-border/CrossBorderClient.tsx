'use client';

import * as React from 'react';
import {
  Plus, Trash2, Save, ArrowUp, ArrowDown, DownloadCloud, Eye, EyeOff, Route,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  listCrossBorderStepsAction,
  createCrossBorderStepAction,
  updateCrossBorderStepAction,
  deleteCrossBorderStepAction,
  reorderCrossBorderStepAction,
  seedCrossBorderStepsAction,
  type CrossBorderStepDTO,
  type Nationality,
  type Country,
  type Purpose,
  type StepLang,
} from '@/lib/cross-border-actions';

const NATIONALITIES: { v: Nationality; l: string }[] = [
  { v: 'TR', l: 'Türk vatandaşı (TR)' },
  { v: 'AZ', l: 'Azerbaycan vatandaşı (AZ)' },
  { v: 'OTHER', l: 'Diğer / Yabancı' },
];
const COUNTRIES: { v: Country; l: string }[] = [
  { v: 'TR', l: 'Türkiye' },
  { v: 'AZ', l: 'Azerbaycan' },
];
const PURPOSES: { v: Purpose; l: string }[] = [
  { v: 'oturum', l: 'Oturum' },
  { v: 'yatirim', l: 'Yatırım' },
  { v: 'isyeri', l: 'İş yeri' },
];
const LANGS: { v: StepLang; l: string }[] = [
  { v: 'tr', l: 'Türkçe' },
  { v: 'az', l: 'Azərbaycan' },
  { v: 'en', l: 'English' },
  { v: 'ru', l: 'Русский' },
  { v: 'de', l: 'Deutsch' },
  { v: 'zh', l: '中文' },
];

const ICON_HINTS = 'FileCheck2, Scale, Coins, Globe2, BookOpen, CheckCircle2, Home, Building2, Banknote, Stamp';

interface EditState {
  id?: string;
  icon: string;
  title: string;
  description: string;
  active: boolean;
}

export function CrossBorderClient() {
  const { toast } = useToast();

  const [nationality, setNationality] = React.useState<Nationality>('OTHER');
  const [country, setCountry] = React.useState<Country>('TR');
  const [purpose, setPurpose] = React.useState<Purpose>('yatirim');
  const [language, setLanguage] = React.useState<StepLang>('tr');

  const [steps, setSteps] = React.useState<CrossBorderStepDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [working, setWorking] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EditState | null>(null);

  const filter = React.useMemo(
    () => ({ nationality, country, purpose, language }),
    [nationality, country, purpose, language],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listCrossBorderStepsAction(filter);
    setLoading(false);
    if (res.ok && res.steps) setSteps(res.steps);
    else {
      setSteps([]);
      if (res.error) toast({ variant: 'error', title: 'Yüklenemedi', description: res.error });
    }
  }, [filter, toast]);

  React.useEffect(() => { void load(); }, [load]);

  function startCreate() {
    setEditing({ icon: 'FileCheck2', title: '', description: '', active: true });
    setOpen(true);
  }
  function startEdit(s: CrossBorderStepDTO) {
    setEditing({ id: s.id, icon: s.icon ?? 'FileCheck2', title: s.title, description: s.description, active: s.active });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    setWorking(true);
    let res: { ok: boolean; error?: string };
    if (editing.id) {
      res = await updateCrossBorderStepAction(editing.id, {
        icon: editing.icon, title: editing.title, description: editing.description, active: editing.active,
      });
    } else {
      res = await createCrossBorderStepAction({
        ...filter, icon: editing.icon, title: editing.title, description: editing.description,
      });
    }
    setWorking(false);
    if (res.ok) {
      setOpen(false);
      setEditing(null);
      toast({ variant: 'success', title: editing.id ? 'Adım güncellendi' : 'Adım eklendi' });
      void load();
    } else {
      toast({ variant: 'error', title: 'Kaydedilemedi', description: res.error });
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu adımı silmek istediğine emin misin?')) return;
    const res = await deleteCrossBorderStepAction(id);
    if (res.ok) {
      toast({ variant: 'info', title: 'Adım silindi' });
      void load();
    } else {
      toast({ variant: 'error', title: 'Silinemedi', description: res.error });
    }
  }

  async function move(id: string, direction: 'up' | 'down') {
    const res = await reorderCrossBorderStepAction(id, direction);
    if (res.ok) void load();
    else toast({ variant: 'error', title: 'Sıralama değişmedi', description: res.error });
  }

  async function seed() {
    if (!confirm('Hardcoded adımları DB\'ye aktar? (Tabloda kayıt varsa atlanır.)')) return;
    setSeeding(true);
    const res = await seedCrossBorderStepsAction();
    setSeeding(false);
    if (res.ok) {
      if (res.skipped) toast({ variant: 'info', title: 'Atlandı', description: 'Tabloda zaten kayıt var.' });
      else toast({ variant: 'success', title: 'İçe aktarıldı', description: `${res.inserted} adım eklendi.` });
      void load();
    } else {
      toast({ variant: 'error', title: 'Aktarılamadı', description: res.error });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <Route size={20} className="text-gold-300" /> Sınır Ötesi Adımlar
          </h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">
            &quot;Adım adım sınır ötesi alım&quot; rehberinin adımlarını buradan yönetirsin.
            Vatandaşlık + hedef ülke + amaç + dil seç, ardından adımları düzenle.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seed} loading={seeding}>
            <DownloadCloud size={14} /> Hardcoded verileri içe aktar
          </Button>
          <Button variant="gold" onClick={startCreate}><Plus size={14} /> Yeni Adım</Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Vatandaşlık</Label>
              <Select value={nationality} onChange={(e) => setNationality(e.target.value as Nationality)}>
                {NATIONALITIES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </div>
            <div>
              <Label>Hedef ülke</Label>
              <Select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                {COUNTRIES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </div>
            <div>
              <Label>Amaç</Label>
              <Select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                {PURPOSES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </div>
            <div>
              <Label>Dil</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as StepLang)}>
                {LANGS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="text-sm text-[color:var(--fg-muted)] py-8 text-center">Yükleniyor…</div>
      ) : steps.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-sm text-[color:var(--fg-muted)]">
              Bu kombinasyon için kayıtlı adım yok. &quot;Yeni Adım&quot; ile ekle veya
              &quot;Hardcoded verileri içe aktar&quot; ile başlat.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <Card key={s.id} className={s.active ? '' : 'opacity-60'}>
              <CardBody className="flex items-center gap-3 py-3">
                <span className="size-7 rounded-full border border-[color:var(--border-strong)] flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{s.title}</span>
                    <Badge variant="outline" className="!text-[10px]">{s.icon ?? '—'}</Badge>
                    {!s.active && <Badge variant="outline" className="!text-[10px] text-danger">Pasif</Badge>}
                  </div>
                  <p className="text-xs text-[color:var(--fg-muted)] mt-0.5 line-clamp-2">{s.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(s.id, 'up')} aria-label="Yukarı">
                    <ArrowUp size={13} />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={i === steps.length - 1} onClick={() => move(s.id, 'down')} aria-label="Aşağı">
                    <ArrowDown size={13} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEdit(s)}>Düzenle</Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => remove(s.id)} aria-label="Sil">
                    <Trash2 size={12} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing?.id ? 'Adımı Düzenle' : 'Yeni Adım'} size="lg">
        {editing && (
          <div className="space-y-3">
            <div>
              <Label>Başlık</Label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Vergi numarası al" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <Label>Lucide ikon adı</Label>
              <Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="FileCheck2" />
              <p className="text-[11px] text-[color:var(--fg-faint)] mt-1">Örnek: {ICON_HINTS}</p>
            </div>
            {editing.id && (
              <button
                type="button"
                onClick={() => setEditing({ ...editing, active: !editing.active })}
                className="inline-flex items-center gap-2 text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
              >
                {editing.active ? <Eye size={15} className="text-gold-300" /> : <EyeOff size={15} />}
                {editing.active ? 'Aktif (yayında)' : 'Pasif (gizli)'}
              </button>
            )}
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
