'use client';

import * as React from 'react';
import { FileCheck2, Upload, X, Loader2, Check } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { getOfficeDetails, saveOfficeDetailsAction } from '@/lib/office-public-actions';

type Doc = { name: string; url: string };

export function OfficeDetailsCard() {
  const { toast } = useToast();
  const { t } = useLang();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [taxId, setTaxId] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [authorizationNo, setAuthorizationNo] = React.useState('');
  const [officeAddress, setOfficeAddress] = React.useState('');
  const [officeCity, setOfficeCity] = React.useState('');
  const [officeDistrict, setOfficeDistrict] = React.useState('');
  const [docs, setDocs] = React.useState<Doc[]>([]);

  React.useEffect(() => {
    (async () => {
      const d = await getOfficeDetails();
      if (d) {
        setTaxId(d.taxId ?? '');
        setCompanyName(d.companyName ?? '');
        setAuthorizationNo(d.authorizationNo ?? '');
        setOfficeAddress(d.officeAddress ?? '');
        setOfficeCity(d.officeCity ?? '');
        setOfficeDistrict(d.officeDistrict ?? '');
        setDocs(d.docs ?? []);
      }
      setLoading(false);
    })();
  }, []);

  async function onPickDocs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          toast({ variant: 'error', title: t('office.docs.uploadFailed'), description: data.error });
          continue;
        }
        setDocs((prev) => [...prev, { name: file.name, url: data.url }]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const res = await saveOfficeDetailsAction({
      taxId, companyName, authorizationNo, officeAddress, officeCity, officeDistrict, docs,
    });
    setSaving(false);
    if (res.ok) toast({ variant: 'success', title: t('office.docs.saved') });
    else toast({ variant: 'error', title: 'Hata', description: res.error });
  }

  if (loading) return null;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2 font-semibold"><FileCheck2 size={16} className="text-gold-300" /> {t('office.docs.title')}</div>
        <p className="text-xs text-[color:var(--fg-muted)]">{t('office.docs.hint')}</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>{t('office.docs.companyName')}</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={200} /></div>
          <div><Label>{t('office.docs.taxId')}</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={64} placeholder="TC / VÖEN / Fin kod" /></div>
          <div><Label>{t('office.docs.authNo')}</Label><Input value={authorizationNo} onChange={(e) => setAuthorizationNo(e.target.value)} maxLength={64} /></div>
          <div><Label>{t('office.docs.city')}</Label><Input value={officeCity} onChange={(e) => setOfficeCity(e.target.value)} maxLength={64} /></div>
          <div><Label>{t('office.docs.district')}</Label><Input value={officeDistrict} onChange={(e) => setOfficeDistrict(e.target.value)} maxLength={64} /></div>
          <div className="sm:col-span-2"><Label>{t('office.docs.address')}</Label><Input value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} maxLength={500} /></div>
        </div>

        {/* Belge görselleri (yetki belgesi vb.) */}
        <div>
          <Label>{t('office.docs.documents')}</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {docs.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border bg-[color:var(--bg-elev)] px-2.5 py-1.5 text-xs">
                <a href={d.url} target="_blank" rel="noreferrer" className="hover:text-gold-300 truncate max-w-[160px]">{d.name || 'belge'}</a>
                <button type="button" onClick={() => setDocs((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Kaldır" className="text-[color:var(--fg-muted)] hover:text-danger"><X size={13} /></button>
              </span>
            ))}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onPickDocs} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {t('office.docs.upload')}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="gold" onClick={save} loading={saving}><Check size={14} /> {t('dash.settings.save')}</Button>
        </div>
      </CardBody>
    </Card>
  );
}
