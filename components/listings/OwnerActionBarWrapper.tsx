'use client';

import { useUser } from '@/lib/user-auth';
import { OwnerActionBar } from './OwnerActionBar';

interface Props {
  listingId: string;
  agentId: string;
  currentTier: string;
  isApproved: boolean;
  isPrivate: boolean;
  price: number;
}

/**
 * Client wrapper that checks if the current viewer is the listing owner.
 * Rendered inside the ISR property page — only shows OwnerActionBar when
 * the authenticated user matches the listing's agentId.
 */
export function OwnerActionBarWrapper({ listingId, agentId, currentTier, isApproved, isPrivate, price }: Props) {
  const { user, ready } = useUser();

  // Don't render anything until we know who the viewer is
  if (!ready) return null;
  // Only show when the authenticated user is the listing owner
  if (!user || user.id !== agentId) return null;

  return (
    <OwnerActionBar
      listingId={listingId}
      currentTier={currentTier}
      isApproved={isApproved}
      isPrivate={isPrivate}
      price={price}
      userKycStatus={user.kycStatus}
    />
  );
}
