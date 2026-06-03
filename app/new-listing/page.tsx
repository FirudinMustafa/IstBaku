import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import { NewListingClient } from './NewListingClient';
import { getActiveCountries } from '@/lib/queries/countries';
import { getAllPrices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/new-listing');

  const paymentEnabled = Boolean(process.env.PAYMENT_PROVIDER_KEY);
  const [countries, prices] = await Promise.all([getActiveCountries('tr'), getAllPrices()]);

  return (
    <NewListingClient
      paymentEnabled={paymentEnabled}
      countries={countries}
      prices={{ badge: prices.istbaku_badge, private: prices.private }}
    />
  );
}
