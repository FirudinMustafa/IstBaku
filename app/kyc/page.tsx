import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import { getMyKycState } from '@/lib/kyc-actions';
import { KycClient } from './KycClient';

export const dynamic = 'force-dynamic';

export default async function KycPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/kyc');

  const state = await getMyKycState();

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Kimlik Doğrulama (KYC)</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Gizli portföy ve premium özelliklere erişmek için kimliğini doğrula. Belgelerin güvenli
          (özel) olarak saklanır ve yalnızca yetkili moderatörlerce incelenir.
        </p>
      </div>
      <KycClient initialStatus={state?.status ?? 'none'} lastType={state?.lastType} reviewNotes={state?.reviewNotes ?? null} />
    </main>
  );
}
