'use client';

import * as React from 'react';
import { User, Mail, Lock, Check, ShieldAlert, Camera, Loader2, Building2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/layout/LangProvider';
import { COUNTRY_CODES } from '@/lib/labels';
import {
  getMyAccount, updateProfileAction, changePasswordAction, changeEmailAction, updateAvatarAction,
  type MyAccount,
} from '@/lib/account-actions';
import { updateOfficeAboutAction } from '@/lib/office-public-actions';
import { OfficeDetailsCard } from './OfficeDetailsCard';
import { verifyCodeAction } from '@/lib/auth-actions';

export function AccountSettings() {
  const { toast } = useToast();
  const { t } = useLang();
  const [acc, setAcc] = React.useState<MyAccount | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Profil
  const [name, setName] = React.useState('');
  const [phoneDial, setPhoneDial] = React.useState('+90');
  const [phone, setPhone] = React.useState('');
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Profil fotoğrafı
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Ofis — Hakkımızda
  const [about, setAbout] = React.useState('');
  const [savingAbout, setSavingAbout] = React.useState(false);

  // E-posta
  const [newEmail, setNewEmail] = React.useState('');
  const [emailPassword, setEmailPassword] = React.useState('');
  const [emailStep, setEmailStep] = React.useState<'idle' | 'verify'>('idle');
  const [emailCode, setEmailCode] = React.useState('');
  const [savingEmail, setSavingEmail] = React.useState(false);

  // Şifre
  const [curPw, setCurPw] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [newPw2, setNewPw2] = React.useState('');
  const [savingPw, setSavingPw] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const a = await getMyAccount();
    if (a) {
      setAcc(a);
      setName(a.name);
      setPhoneDial(a.phoneDial || '+90');
      setPhone(a.phone || '');
      setAvatar(a.avatar);
      setAbout(a.about || '');
    }
    setLoading(false);
  }, []);

  async function saveAbout() {
    setSavingAbout(true);
    const res = await updateOfficeAboutAction(about);
    setSavingAbout(false);
    if (res.ok) {
      toast({ variant: 'success', title: t('settings.saved'), description: t('settings.aboutSaved') });
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // aynı dosyayı tekrar seçebilmek için
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: t('settings.invalidFile'), description: t('settings.invalidFile.desc') });
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/avatars/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast({ variant: 'error', title: t('settings.uploadFailed'), description: data.error ?? t('settings.uploadFailed.desc') });
        return;
      }
      const save = await updateAvatarAction(data.url);
      if (!save.ok) {
        toast({ variant: 'error', title: t('settings.saveFailed'), description: save.error });
        return;
      }
      setAvatar(data.url);
      toast({ variant: 'success', title: t('settings.avatarUpdated') });
    } catch {
      toast({ variant: 'error', title: t('common.error'), description: t('settings.connError') });
    } finally {
      setUploadingAvatar(false);
    }
  }

  React.useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSavingProfile(true);
    const res = await updateProfileAction({ name, phoneDial, phone });
    setSavingProfile(false);
    if (res.ok) {
      toast({ variant: 'success', title: t('settings.saved'), description: t('settings.profileSaved') });
      load();
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  async function startEmailChange() {
    setSavingEmail(true);
    const res = await changeEmailAction({ newEmail, password: emailPassword });
    setSavingEmail(false);
    if (res.ok) {
      setEmailStep('verify');
      setEmailPassword('');
      toast({ variant: 'success', title: t('settings.codeSent'), description: t('settings.codeSent.desc').replace('{email}', newEmail) });
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  async function verifyNewEmail() {
    setSavingEmail(true);
    const res = await verifyCodeAction(newEmail, emailCode);
    setSavingEmail(false);
    if (res.ok) {
      toast({ variant: 'success', title: t('settings.emailVerified'), description: t('settings.emailVerified.desc') });
      setEmailStep('idle');
      setNewEmail('');
      setEmailCode('');
      load();
    } else {
      toast({ variant: 'error', title: t('settings.codeWrong'), description: res.error });
    }
  }

  async function savePassword() {
    if (newPw !== newPw2) {
      toast({ variant: 'error', title: t('settings.pwMismatch') });
      return;
    }
    setSavingPw(true);
    const res = await changePasswordAction({ currentPassword: curPw, newPassword: newPw });
    setSavingPw(false);
    if (res.ok) {
      toast({ variant: 'success', title: t('settings.pwChanged') });
      setCurPw(''); setNewPw(''); setNewPw2('');
    } else {
      toast({ variant: 'error', title: t('common.error'), description: res.error });
    }
  }

  if (loading) {
    return <div className="text-[color:var(--fg-muted)] py-10 text-center">{t('dash.settings.loading')}</div>;
  }
  if (!acc) {
    return <div className="text-[color:var(--fg-muted)] py-10 text-center">{t('dash.settings.loadError')}</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-bold">{t('dash.settings.heading')}</h2>

      {/* Profil */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 font-semibold"><User size={16} className="text-gold-300" /> {t('dash.settings.profile')}</div>

          {/* Profil fotoğrafı */}
          <div className="flex items-center gap-4">
            <div className="relative size-20 rounded-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg-elev)] shrink-0">
              {avatar
                ? <img src={avatar} alt="" className="size-full object-cover" />
                : <div className="size-full flex items-center justify-center text-[color:var(--fg-muted)]"><User size={28} /></div>}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
              <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                <Camera size={14} /> {t('dash.settings.changePhoto')}
              </Button>
              <p className="text-[11px] text-[color:var(--fg-muted)]">{t('dash.settings.photoHint')}</p>
            </div>
          </div>

          <div>
            <Label>{t('dash.settings.fullName')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <div>
              <Label>{t('dash.settings.countryCode')}</Label>
              <Select value={phoneDial} onChange={(e) => setPhoneDial(e.target.value)}>
                {COUNTRY_CODES.map((c) => (
                  <option key={c.iso} value={c.dial}>{c.flag} {c.dial}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('dash.settings.phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5xx xxx xx xx" inputMode="tel" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="gold" onClick={saveProfile} loading={savingProfile}><Check size={14} /> {t('dash.settings.save')}</Button>
          </div>
        </CardBody>
      </Card>

      {/* Ofis — Hakkımızda (sadece ofis hesapları) */}
      {acc.isOffice && (
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2 font-semibold"><Building2 size={16} className="text-gold-300" /> {t('dash.settings.officeAbout')}</div>
            <p className="text-xs text-[color:var(--fg-muted)]">{t('dash.settings.officeAboutHint')}</p>
            <Textarea id="office-about" rows={5} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={2000} placeholder={t('dash.settings.officeAboutPh')} />
            <div className="flex justify-end">
              <Button variant="gold" onClick={saveAbout} loading={savingAbout}><Check size={14} /> {t('dash.settings.save')}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ofis bilgileri & belgeler (KYC — Madde 5/6) */}
      {acc.isOffice && <OfficeDetailsCard />}

      {/* E-posta */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><Mail size={16} className="text-gold-300" /> {t('dash.settings.email')}</div>
            {acc.emailVerified
              ? <Badge variant="success" className="!text-[10px]"><Check size={11} /> {t('dash.settings.verified')}</Badge>
              : <Badge variant="gold" className="!text-[10px]"><ShieldAlert size={11} /> {t('dash.settings.unverified')}</Badge>}
          </div>
          <div className="text-sm text-[color:var(--fg-muted)]">{t('dash.settings.current')} <strong className="text-[color:var(--fg)]">{acc.email}</strong></div>

          {emailStep === 'idle' ? (
            <>
              <div>
                <Label>{t('dash.settings.newEmail')}</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="yeni@eposta.com" />
              </div>
              <div>
                <Label>{t('dash.settings.passwordForVerify')}</Label>
                <Input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={startEmailChange} loading={savingEmail} disabled={!newEmail || !emailPassword}>
                  {t('dash.settings.sendCode')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-[color:var(--fg-muted)]">
                <strong className="text-[color:var(--fg)]">{newEmail}</strong> {t('dash.settings.enterCode')}
              </div>
              <div>
                <Label>{t('dash.settings.code')}</Label>
                <Input value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="______" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setEmailStep('idle'); setEmailCode(''); }}>{t('dash.settings.cancel')}</Button>
                <Button variant="gold" onClick={verifyNewEmail} loading={savingEmail} disabled={emailCode.length !== 6}>{t('dash.settings.verify')}</Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Şifre */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 font-semibold"><Lock size={16} className="text-gold-300" /> {t('dash.settings.changePassword')}</div>
          <div>
            <Label>{t('dash.settings.currentPassword')}</Label>
            <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('dash.settings.newPassword')}</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div>
              <Label>{t('dash.settings.newPasswordRepeat')}</Label>
              <Input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="gold" onClick={savePassword} loading={savingPw} disabled={!curPw || newPw.length < 8}>
              <Check size={14} /> {t('dash.settings.updatePassword')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
