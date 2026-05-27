'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ListChecks, Users, Briefcase, ShieldCheck,
  Flag, CreditCard, BarChart3, FileText, Bell, Search, Crown, LogOut, BookOpen,
  Newspaper, Menu, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', l: 'Genel Bakış', i: LayoutDashboard },
  { href: '/admin/approvals', l: 'İlan Onayları', i: ListChecks },
  { href: '/admin/users', l: 'Kullanıcılar', i: Users },
  { href: '/admin/agents', l: 'Ofisler & Ajanlar', i: Briefcase },
  { href: '/admin/kyc', l: 'KYC İnceleme', i: ShieldCheck },
  { href: '/admin/reports', l: 'Şikayetler', i: Flag },
  { href: '/admin/payments', l: 'Ödemeler & Gelir', i: CreditCard },
  { href: '/admin/analytics', l: 'Analitik', i: BarChart3 },
  { href: '/admin/country-guides', l: 'Ülke Rehberleri', i: BookOpen },
  { href: '/admin/blog', l: 'Blog / Haberler', i: Newspaper },
  { href: '/admin/publishers', l: 'Blog Yayıncıları', i: Newspaper },
  { href: '/admin/audit', l: 'Denetim Logu', i: FileText },
];

interface AdminInfo { id: string; name: string; email: string; role: string }

export function AdminShell({
  admin, logoutAction, children,
}: { admin: AdminInfo; logoutAction: () => Promise<void>; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => { setDrawerOpen(false); }, [pathname]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const Sidebar = (
    <>
      <div className="p-5 border-b">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center text-navy-900 font-bold text-sm">
              AD
            </div>
            <div>
              <div className="font-bold text-sm leading-none">ISTBAKU</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold-300 mt-1">Admin Console</div>
            </div>
          </Link>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Kapat"
            className="lg:hidden touch-target size-10 rounded-xl hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors touch-target',
                active
                  ? 'bg-gold-400/15 text-gold-300'
                  : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-card-hover)]',
              )}
            >
              <span className="inline-flex items-center gap-2.5"><item.i size={15} /> {item.l}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="rounded-xl border bg-gradient-to-br from-navy-700 to-navy-900 p-3 text-white">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-gold-300" />
            <div className="text-xs font-semibold flex-1 truncate">{admin.name}</div>
          </div>
          <div className="text-[10px] text-navy-200 mt-1 truncate">{admin.email}</div>
          <Badge variant="outline" className="!text-[9px] mt-2">{admin.role}</Badge>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 text-xs text-navy-200 hover:text-gold-300 border-t border-white/10 pt-2"
            >
              <LogOut size={11} /> Çıkış yap
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[color:var(--border)] min-h-screen sticky top-0 bg-[color:var(--bg-elev)]">
          {Sidebar}
        </aside>

        <div
          className={cn(
            'lg:hidden fixed inset-0 z-[60] transition-opacity duration-200',
            drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={cn(
              'absolute left-0 top-0 bottom-0 w-72 max-w-[86%] bg-[color:var(--bg-elev)] border-r border-[color:var(--border)] shadow-2xl flex flex-col',
              'transition-transform duration-300 ease-out',
              drawerOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {Sidebar}
          </aside>
        </div>

        <main className="flex-1 min-w-0">
          <div className="h-14 px-3 sm:px-6 border-b border-[color:var(--border)] bg-[color:var(--bg-elev)]/80 backdrop-blur sticky top-0 z-30 flex items-center gap-2 sm:gap-3 safe-top">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Menü"
              className="lg:hidden touch-target size-10 rounded-lg border bg-[color:var(--bg-card)] flex items-center justify-center active:scale-95"
            >
              <Menu size={18} />
            </button>

            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-2.5 text-[color:var(--fg-muted)]" />
              <input
                placeholder="Ara…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[color:var(--bg-card)] border text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden md:inline text-xs text-[color:var(--fg-muted)]">{admin.role}</span>
              <Link href="/admin/reports" className="size-10 rounded-lg border bg-[color:var(--bg-card)] flex items-center justify-center relative" aria-label="Şikayetler">
                <Bell size={15} />
              </Link>
              <Link href="/" className="hidden sm:inline text-xs text-[color:var(--fg-muted)] hover:text-gold-300 px-2">← Siteye dön</Link>
              <form action={logoutAction} className="lg:hidden">
                <button type="submit" className="touch-target size-10 rounded-lg border bg-[color:var(--bg-card)] flex items-center justify-center text-danger" aria-label="Çıkış">
                  <LogOut size={14} />
                </button>
              </form>
            </div>
          </div>
          <div className="p-3 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
