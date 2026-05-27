import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import { getMyThreads } from '@/lib/message-actions';
import { MessagesClient } from './MessagesClient';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect('/auth/sign-in?next=/messages');
  const params = await searchParams;
  const threads = await getMyThreads();
  return <MessagesClient threads={threads} initialThreadId={params.thread ?? null} meId={me.id} />;
}
