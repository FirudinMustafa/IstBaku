import { redirect } from 'next/navigation';
import { getPrivateListings } from '@/lib/db-queries';
import { getCurrentUser } from '@/lib/auth-actions';
import { PrivatePortfolioClient } from './PrivatePortfolioClient';

export const dynamic = 'force-dynamic';

export default async function PrivatePortfolioPage() {
  // MC-10: gate the private portfolio behind authentication + KYC approval.
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/sign-in?next=/private-portfolio');
  }
  if (user.kycStatus !== 'approved') {
    // KYC pending or rejected: 403 page.
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Gizli portföy erişimi kısıtlı</h1>
        <p className="text-[color:var(--fg-muted)]">
          Bu sayfayı görüntülemek için KYC doğrulamanın <strong>onaylanmış</strong> olması gerekiyor.
        </p>
        <p className="mt-4 text-sm text-[color:var(--fg-muted)]">
          Mevcut KYC durumun: <code>{user.kycStatus}</code>
        </p>
      </div>
    );
  }

  let listings: Awaited<ReturnType<typeof getPrivateListings>> = [];
  try {
    listings = await getPrivateListings();
  } catch (err) {
    console.error('private portfolio query failed', err);
  }
  return <PrivatePortfolioClient initial={listings} />;
}
