import { redirect } from 'next/navigation';
import { getPrivateListings } from '@/lib/db-queries';
import { getCurrentUser } from '@/lib/auth-actions';
import { PrivatePortfolioClient } from './PrivatePortfolioClient';
import { T } from '@/components/i18n/T';

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
        <h1 className="mb-3 text-2xl font-semibold"><T k="portfolio.restricted.title" /></h1>
        <p className="text-[color:var(--fg-muted)]">
          <T k="portfolio.restricted.body" />
        </p>
        <p className="mt-4 text-sm text-[color:var(--fg-muted)]">
          <T k="portfolio.restricted.current" /> <code>{user.kycStatus}</code>
        </p>
        <a
          href="/kyc"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-300"
        >
          {user.kycStatus === 'pending' ? <T k="portfolio.restricted.viewKyc" /> : <T k="portfolio.restricted.startKyc" />}
        </a>
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
