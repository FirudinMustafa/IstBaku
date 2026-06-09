import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import { getMyKycState, getKycContext } from '@/lib/kyc-actions';
import { KycClient } from './KycClient';
import { T } from '@/components/i18n/T';

export const dynamic = 'force-dynamic';

export default async function KycPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/kyc');

  const [state, ctx] = await Promise.all([getMyKycState(), getKycContext()]);

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold"><T k="kyc.heading" /></h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          <T k="kyc.pageDesc" />
        </p>
      </div>
      <KycClient
        initialStatus={state?.status ?? 'none'}
        lastType={state?.lastType}
        reviewNotes={state?.reviewNotes ?? null}
        isOffice={ctx?.isOffice ?? false}
        country={ctx?.country ?? null}
        officePrefill={ctx?.office ?? null}
      />
    </main>
  );
}
