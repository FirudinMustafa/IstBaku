import { getAllUsers } from '@/lib/admin-queries';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await getAllUsers();
  return (
    <UsersClient
      initial={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        country: u.country ?? 'OTHER',
        status: u.status,
        kyc: u.kycStatus,
        premium: u.premium,
        joinedAt: u.createdAt.toISOString(),
        lastSeen: (u.lastSeenAt ?? u.createdAt).toISOString(),
      }))}
    />
  );
}
