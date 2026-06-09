'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Upload, X, FileText, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { kycSchema, fieldErrors } from '@/lib/schemas';
import { submitKycAction, type KycType } from '@/lib/kyc-actions';
import { cn } from '@/lib/utils';

type Status = 'none' | 'pending' | 'approved' | 'rejected';
type Doc = { name: string; url: string };

const TYPE_OPTIONS: { v: KycType; labelKey: string; hintKey: string }[] = [
  { v: 'investor', labelKey: 'kyc.type.investor', hintKey: 'kyc.type.investorHint' },
  { v: 'agent_license', labelKey: 'kyc.type.agentLicense', hintKey: 'kyc.type.agentLicenseHint' },
  { v: 'title_deed', labelKey: 'kyc.type.titleDeed', hintKey: 'kyc.type.titleDeedHint' },
];

/** Ülkeye göre ofis alanı etiketleri (tur3 #4/#5). AZ ve TR farklı terimler. */
function officeLabels(country: string | null) {
  const az = (country ?? '').toUpperCase() === 'AZ';
  return az
    ? {
        heading: 'Ofis / Şirkət məlumatları',
        note: 'Fiziki şəxs və ya şirkət üçün rəsmi məlumatlar və sənəd şəkilləri.',
        fullName: 'Rəhbər (Ad Soyad)',
        idNumber: 'FIN kod',
        idPlaceholder: 'Məs: 7AB12CD',
        companyName: 'Şirkətin adı',
        taxId: 'Şirkətin VÖEN-i',
        authorizationNo: 'Səlahiyyət sənədi № (varsa)',
        officeAddress: 'Açıq ünvan',
        officeCity: 'Şəhər',
        officeDistrict: 'Rayon',
        docs: 'Rəsmi sənəd şəkilləri (şəxsiyyət, VÖEN, səlahiyyət)',
      }
    : {
        heading: 'Ofis / Şirket bilgileri',
        note: 'Şahıs şirketi veya tüzel kişi için resmi bilgiler ve belge görselleri.',
        fullName: 'Yetkili (Ad Soyad)',
        idNumber: 'TC Kimlik No',
        idPlaceholder: 'Örn: 12345678901',
        companyName: 'Şirket adı',
        taxId: 'Vergi Kimlik No',
        authorizationNo: 'Yetki belge no',
        officeAddress: 'Açık adres',
        officeCity: 'İl',
        officeDistrict: 'Mahalle / Semt',
        docs: 'Belge görselleri (kimlik, vergi levhası, yetki belgesi)',
      };
}

export function KycClient({
  initialStatus,
  lastType,
  reviewNotes,
  isOffice = false,
  country = null,
  officePrefill = null,
}: {
  initialStatus: Status;
  lastType?: string;
  reviewNotes: string | null;
  isOffice?: boolean;
  country?: string | null;
  officePrefill?: {
    companyName: string | null; taxId: string | null; authorizationNo: string | null;
    officeAddress: string | null; officeCity: string | null; officeDistrict: string | null;
  } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
  const L = officeLabels(country);

  const [status, setStatus] = React.useState<Status>(initialStatus);
  const [type, setType] = React.useState<KycType>(isOffice ? 'agent_license' : 'investor');
  const [fullName, setFullName] = React.useState('');
  const [idNumber, setIdNumber] = React.useState('');
  // Ofis alanları (prefill)
  const [companyName, setCompanyName] = React.useState(officePrefill?.companyName ?? '');
  const [taxId, setTaxId] = React.useState(officePrefill?.taxId ?? '');
  const [authorizationNo, setAuthorizationNo] = React.useState(officePrefill?.authorizationNo ?? '');
  const [officeAddress, setOfficeAddress] = React.useState(officePrefill?.officeAddress ?? '');
  const [officeCity, setOfficeCity] = React.useState(officePrefill?.officeCity ?? '');
  const [officeDistrict, setOfficeDistrict] = React.useState(officePrefill?.officeDistrict ?? '');
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
          <h2 className="font-semibold">{t('kyc.approved.heading')}</h2>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{t('kyc.approved.desc')}</p>
          <Button className="mt-4" onClick={() => router.push('/private-portfolio')}>{t('kyc.approved.cta')}</Button>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div role="status" className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-6 flex items-start gap-3">
        <Clock className="text-gold-300 shrink-0" />
        <div>
          <h2 className="font-semibold">{t('kyc.pending.heading')}</h2>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
            {t('kyc.pending.desc')}
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
          toast({ variant: 'error', title: t('kyc.toast.maxDocs') });
          break;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t('kyc.err.uploadGeneric'));
        setDocs((d) => [...d, { name: file.name, url: json.url }]);
      }
    } catch (e) {
      toast({ variant: 'error', title: t('kyc.toast.uploadFailed'), description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    setErrors({});
    const payload = isOffice
      ? {
          fullName, idNumber, documents: docs, acceptedTerms: accept as true,
          isOfficeKyc: true, companyName, taxId, authorizationNo, officeAddress, officeCity, officeDistrict,
        }
      : { fullName, idNumber, documents: docs, acceptedTerms: accept as true };
    const parsed = kycSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return;
    }
    setBusy(true);
    const res = await submitKycAction({ ...parsed.data, type: isOffice ? 'agent_license' : type });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: 'error', title: t('kyc.toast.submitFailed'), description: res.error });
      return;
    }
    setStatus('pending');
    toast({ variant: 'success', title: t('kyc.toast.received.title'), description: t('kyc.toast.received.desc') });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {status === 'rejected' && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 flex items-start gap-2 text-sm">
          <AlertCircle className="text-danger shrink-0" size={18} />
          <div>
            <strong>{t('kyc.rejected.lead')}</strong> {reviewNotes ? t('kyc.rejected.note').replace('{note}', reviewNotes) : t('kyc.rejected.retry')}
          </div>
        </div>
      )}

      {isOffice ? (
        /* ----- OFİS / ŞİRKET KYC (ülkeye göre alanlar) ----- */
        <div className="space-y-4">
          <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-3 flex items-start gap-2">
            <Building2 size={18} className="text-gold-300 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">{L.heading}</div>
              <p className="text-[12px] text-[color:var(--fg-muted)] mt-0.5">{L.note}</p>
            </div>
          </div>

          <Input label={L.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={L.idNumber} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} error={errors.idNumber} placeholder={L.idPlaceholder} />
            <Input label={L.taxId} value={taxId} onChange={(e) => setTaxId(e.target.value)} error={errors.companyName && !taxId ? t('kyc.required') : undefined} />
            <Input label={L.companyName} value={companyName} onChange={(e) => setCompanyName(e.target.value)} error={errors.companyName} />
            <Input label={L.authorizationNo} value={authorizationNo} onChange={(e) => setAuthorizationNo(e.target.value)} />
            <Input label={L.officeCity} value={officeCity} onChange={(e) => setOfficeCity(e.target.value)} />
            <Input label={L.officeDistrict} value={officeDistrict} onChange={(e) => setOfficeDistrict(e.target.value)} />
          </div>
          <Input label={L.officeAddress} value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} />

          <div>
            <Label>{L.docs}</Label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(e) => uploadFiles(e.target.files)} className="sr-only" />
            <div className="mt-2 space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-[color:var(--bg-elev)] p-2 text-sm">
                  <FileText size={16} className="text-gold-300 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <button type="button" onClick={() => setDocs((arr) => arr.filter((_, j) => j !== i))} className="size-7 rounded-md hover:bg-danger/10 hover:text-danger flex items-center justify-center" aria-label={t('kyc.removeDoc')}><X size={14} /></button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || docs.length >= 10}>
                <Upload size={15} /> {uploading ? t('kyc.uploading') : t('kyc.addDocImage')}
              </Button>
              {errors.documents && <p role="alert" className="text-xs text-danger">{errors.documents}</p>}
            </div>
          </div>
        </div>
      ) : (
        /* ----- BİREYSEL KYC ----- */
        <>
          <div>
            <Label>{t('kyc.field.type')}</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {TYPE_OPTIONS.map((o) => (
                <button key={o.v} type="button" onClick={() => setType(o.v)} aria-pressed={type === o.v}
                  className={cn('rounded-xl border p-3 text-left text-sm', type === o.v ? 'border-gold-400 bg-gold-400/10 text-gold-300' : 'border-[color:var(--border)] bg-[color:var(--bg-elev)] hover:border-[color:var(--border-strong)]')}>
                  <div className="font-semibold">{t(o.labelKey)}</div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--fg-muted)]">{t(o.hintKey)}</div>
                </button>
              ))}
            </div>
          </div>

          <Input label={t('kyc.field.fullNameDoc')} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} placeholder={t('kyc.field.fullNamePh')} />
          <Input label={t('kyc.field.idPassport')} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} error={errors.idNumber} placeholder={t('kyc.field.idPh')} />

          <div>
            <Label>{t('kyc.field.docs')}</Label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(e) => uploadFiles(e.target.files)} className="sr-only" />
            <div className="mt-2 space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-[color:var(--bg-elev)] p-2 text-sm">
                  <FileText size={16} className="text-gold-300 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <button type="button" onClick={() => setDocs((arr) => arr.filter((_, j) => j !== i))} className="size-7 rounded-md hover:bg-danger/10 hover:text-danger flex items-center justify-center" aria-label={t('kyc.removeDoc')}><X size={14} /></button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || docs.length >= 10}>
                <Upload size={15} /> {uploading ? t('kyc.uploading') : t('kyc.addDoc')}
              </Button>
              {errors.documents && <p role="alert" className="text-xs text-danger">{errors.documents}</p>}
            </div>
          </div>
        </>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5" />
        <span>{t('kyc.consent')}</span>
      </label>
      {errors.acceptedTerms && <p role="alert" className="text-xs text-danger -mt-3">{errors.acceptedTerms}</p>}

      <Button onClick={submit} disabled={busy} className="w-full">
        <ShieldCheck size={16} /> {busy ? t('kyc.submitting') : t('kyc.submitBtn')}
      </Button>
    </div>
  );
}
