import { getAllPrices } from '@/lib/pricing';
import { PricingClient } from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function AdminPricingPage() {
  const prices = await getAllPrices();
  return <PricingClient initial={prices} />;
}
