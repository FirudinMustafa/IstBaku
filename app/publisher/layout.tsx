import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import Link from 'next/link';

export default async function PublisherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'blog_publisher') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <header className="h-14 px-4 border-b bg-[color:var(--bg-elev)] flex items-center justify-between">
        <Link href="/publisher" className="font-bold text-sm flex items-center gap-2">
          <span className="size-8 rounded-lg bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 flex items-center justify-center text-xs font-bold">BP</span>
          ISTBAKU Blog Paneli
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[color:var(--fg-muted)]">{user.name}</span>
          <Link href="/" className="text-xs text-[color:var(--fg-muted)] hover:text-gold-300">← Siteye dön</Link>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
