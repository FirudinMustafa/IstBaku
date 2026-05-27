import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import { NewListingClient } from './NewListingClient';
import { getActiveCountries } from '@/lib/queries/countries';

export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/new-listing');

  const paymentEnabled = Boolean(process.env.PAYMENT_PROVIDER_KEY);
  const countries = await getActiveCountries('tr');

  return <NewListingClient paymentEnabled={paymentEnabled} countries={countries} />;
}
