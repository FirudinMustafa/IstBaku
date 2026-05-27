import { redirect, notFound } from 'next/navigation';
import { getEditableListing } from '@/lib/listing-actions';
import { getCurrentUser } from '@/lib/auth-actions';
import { EditListingForm } from './EditListingForm';
import { rowToProperty } from '@/lib/db-mappers';

export const dynamic = 'force-dynamic';

export default async function EditPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/sign-in?next=/property/${slug}/edit`);

  const row = await getEditableListing(slug);
  if (!row) notFound();

  return <EditListingForm initial={rowToProperty(row)} />;
}
