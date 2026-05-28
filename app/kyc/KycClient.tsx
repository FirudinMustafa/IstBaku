'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Upload, X, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { kycSchema, fieldErrors } from '@/lib/schemas';
import { submitKycAction, type KycType } from '@/lib/kyc-actions';
import { cn } from '@/lib/utils';

type Status = 'none' | 'pending' | 'approved' | 'rejected';
type Doc = { name: string; url: string };

const TYPE_OPTIONS: { v: KycType; label: string; hint: string }[] = [
  { v: 'investor', label: 'Yatırımcı', hint: 'Kimlik belgesi ile bireysel doğrulama.' },
  { v: 'agent_license', label: 'Emlakçı / Lisans', hint: 'Yetki belgesi veya lisans.' },
  { v: 'title_deed', label: 'Tapu / Mülk Sahibi', hint: 'Tapu belgesi ile doğrulama.' },
];

export function KycClient({
  initialStatus,
  lastType,
  reviewNotes,
}: {
  initialStatus: Status;
  lastType?: string;
  reviewNotes: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = React.useState<Status>(initialStatus);
  const [type, setType] = React.useState<KycType>('investor');
  const [fullName, setFullName] = React.useState('');
  const [idNumber, setIdNumber] = React.useState('');
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [accept, setAccept] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);

  if (status === 'approved') {
    return (
      <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-6 flex items-start gap-3">
        <CheckCircle2 className="text-success shrink-0" />
        <div>
          <h2 className="font-semibold">Kimliğin doğrulandı</h2>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">Gizli portföy ve premium özelliklere erişebilirsin.</p>
          <Button className="mt-4" onClick={() => router.push('/private-portfolio')}>Gizli portföye git</Button>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div role="status" className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-6 flex items-start gap-3">
        <Clock className="text-gold-300 shrink-0" />
        <div>
          <h2 className="font-semibold">Başvurun inceleniyor</h2>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
            Belgelerin moderatör onayında. Sonucu e-posta ile bildireceğiz.
          </p>
        </div>
      </div>
    );
  }

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (docs.length >= 10) {
          toast({ variant: 'error', title: 'En fazla 10 belge yükleyebilirsin.' });
          break;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Yükleme başarısız.');
        setDocs((d) => [...d, { name: file.name, url: json.url }]);
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Belge yüklenemedi', description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    setErrors({});
    const payload = { fullName, idNumber, documents: docs, acceptedTerms: accept as true };
    const parsed = kycSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return;
    }
    setBusy(true);
    const res = await submitKycAction({ ...parsed.data, type });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: 'error', title: 'Başvuru gönderilemedi', description: res.error });
      return;
    }
    setStatus('pending');
    toast({ variant: 'success', title: 'KYC başvurun alındı', description: 'Sonucu e-posta ile bildireceğiz.' });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {status === 'rejected' && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 flex items-start gap-2 text-sm">
          <AlertCircle className="text-danger shrink-0" size={18} />
          <div>
            <strong>Önceki başvurun reddedildi.</strong> {reviewNotes ? `Not: ${reviewNotes}` : 'Belgeleri tekrar yükleyip yeniden gönderebilirsin.'}
          </div>
        </div>
      )}

      <div>
        <Label>Doğrulama türü</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setType(o.v)}
              aria-pressed={type === o.v}
              className={cn(
                'rounded-xl border p-3 text-left text-sm',
                type === o.v ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] hover:border-[color:var(--border-strong)]',
              )}
            >
              <div className="font-semibold">{o.label}</div>
              <div className="mt-0.5 text-[11px] text-[color:var(--fg-muted)]">{o.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Ad Soyad (belgedeki gibi)"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
        placeholder="Örn: Ayşe Yılmaz"
      />
      <Input
        label="Kimlik / Pasaport No"
        value={idNumber}
        onChange={(e) => setIdNumber(e.target.value)}
        error={errors.idNumber}
        placeholder="Örn: 12345678901"
      />

      <div>
        <Label>Belgeler (kimlik, tapu, lisans — PDF/JPG/PNG)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) => uploadFiles(e.target.files)}
          className="sr-only"
        />
        <div className="mt-2 space-y-2">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-[color:var(--bg-elev)] p-2 text-sm">
              <FileText size={16} className="text-gold-300 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <button
                type="button"
                onClick={() => setDocs((arr) => arr.filter((_, j) => j !== i))}
                className="size-7 rounded-md hover:bg-danger/10 hover:text-danger flex items-center justify-center"
                aria-label="Belgeyi kaldır"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || docs.length >= 10}>
            <Upload size={15} /> {uploading ? 'Yükleniyor…' : 'Belge ekle'}
          </Button>
          {errors.documents && <p role="alert" className="text-xs text-danger">{errors.documents}</p>}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5" />
        <span>KVKK aydınlatma metnini ve belgelerimin doğrulama amacıyla işlenmesini kabul ediyorum.</span>
      </label>
      {errors.acceptedTerms && <p role="alert" className="text-xs text-danger -mt-3">{errors.acceptedTerms}</p>}

      <Button onClick={submit} disabled={busy} className="w-full">
        <ShieldCheck size={16} /> {busy ? 'Gönderiliyor…' : 'KYC başvurusunu gönder'}
      </Button>
    </div>
  );
}
