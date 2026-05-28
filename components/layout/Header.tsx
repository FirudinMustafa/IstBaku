'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Plus, Bell, User as UserIcon, Sparkles, ShieldCheck, MessageSquare,
  Crown, FileText, Building2, Scale, ChevronRight, Settings, LogOut, Newspaper,
} from 'lucide-react';
import { useLang } from './LangProvider';
import { LangSwitcher } from './LangSwitcher';
import { CurrencySwitcher } from './CurrencySwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications-store';
import { useUser } from '@/lib/user-auth';
import { LANG_LABELS, SUPPORTED_LANGS } from '@/lib/i18n';
import { FocusTrap } from '@/components/ui/FocusTrap';

const NAV = [
  { key: 'nav.listings', href: '/listings', i: Building2 },
  { key: 'nav.ai_match', href: '/ai-match', i: Sparkles },
  { key: 'nav.private', href: '/private-portfolio', i: Crown },
  { key: 'nav.reports', href: '/reports', i: FileText },
  { key: 'nav.legal', href: '/legal-guide', i: Scale },
  { key: 'nav.blog', href: '/blog', i: Newspaper },
];

export function Header() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { unread } = useNotifications();
  const { user, isAuthenticated, signOut } = useUser();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Drawer açıkken body scroll kilitle + ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Route değişiminde drawer'ı kapat
  React.useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-all safe-top',
          scrolled ? 'glass backdrop-blur-xl shadow-[0_2px_24px_rgba(0,0,0,0.18)]' : 'bg-[color:var(--bg)]/40 backdrop-blur-md md:bg-transparent',
        )}
      >
        <div className="w-full px-4">
          <div className="h-16 flex items-center justify-between gap-3">
            <Logo />

            <nav aria-label="Ana gezinme" className="hidden lg:flex items-center gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'text-gold-300 bg-gold-400/10'
                        : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-card-hover)]',
                    )}
                  >
                    {t(item.key)}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle className="hidden sm:inline-flex" />
              <LangSwitcher />
              <CurrencySwitcher />
              <Link
                href="/dashboard?tab=notifications"
                className="hidden sm:inline-flex relative items-center justify-center size-9 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev)] hover:border-[color:var(--border-strong)]"
                aria-label={`Bildirimler${unread ? ` (${unread} okunmamış)` : ''}`}
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gold-400 text-navy-900 text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link href="/new-listing" className="hidden md:inline-flex">
                <Button variant="gold" size="sm" className="gap-1.5">
                  <Plus size={14} /> {t('nav.new_listing')}
                </Button>
              </Link>
              {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator') && (
                <Link href="/admin" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm" className="gap-1 !text-gold-300">
                    Admin
                  </Button>
                </Link>
              )}
              {user && user.role === 'blog_publisher' && (
                <Link href="/publisher" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm" className="gap-1 !text-gold-300">
                    Blog Paneli
                  </Button>
                </Link>
              )}
              {isAuthenticated && user ? (
                <div ref={userMenuRef} className="hidden sm:inline-block relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev)] hover:border-[color:var(--border-strong)]"
                    aria-label="Hesap menüsü"
                  >
                    {/* MC-23: small avatar — use plain <img> with explicit dimensions to avoid CLS.
                        next/image is overkill for already-small remote avatars but width/height set. */}
                    <img src={user.avatar ?? ''} alt="" width={28} height={28} className="size-7 rounded-lg object-cover" />
                    <span className="text-sm font-medium max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                    <ChevronRight size={14} className={cn('text-[color:var(--fg-muted)] transition-transform', userMenuOpen && 'rotate-90')} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-60 glass rounded-xl border shadow-2xl py-1.5 z-50">
                      <div className="px-3 py-2 border-b">
                        <div className="font-semibold text-sm truncate">{user.name}</div>
                        <div className="text-[11px] text-[color:var(--fg-muted)] truncate">{user.email}</div>
                      </div>
                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]">
                        <UserIcon size={14} /> Panelim
                      </Link>
                      <Link href="/dashboard?tab=favorites" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]">
                        <Crown size={14} /> Favoriler
                      </Link>
                      <Link href="/messages" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]">
                        <MessageSquare size={14} /> Mesajlar
                      </Link>
                      <Link href="/dashboard?tab=notifications" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]">
                        <Bell size={14} /> Bildirimler {unread > 0 && <span className="ml-auto text-[10px] rounded-full bg-gold-400 text-navy-900 px-1.5 py-0.5">{unread}</span>}
                      </Link>
                      <Link href="/dashboard?tab=settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)]">
                        <Settings size={14} /> Ayarlar
                      </Link>
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[color:var(--bg-card-hover)] text-danger border-t mt-1"
                      >
                        <LogOut size={14} /> Çıkış Yap
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth/sign-in" className="hidden sm:inline-flex">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <UserIcon size={14} /> {t('nav.signin')}
                  </Button>
                </Link>
              )}

              {/* Mobil: bildirim ikonu küçük ekranda da görünür */}
              <Link
                href="/dashboard?tab=notifications"
                className="sm:hidden relative inline-flex items-center justify-center size-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev)]"
                aria-label={`Bildirimler${unread ? ` (${unread})` : ''}`}
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gold-400 text-navy-900 text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>

              <button
                className="lg:hidden touch-target inline-flex items-center justify-center size-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev)] active:scale-95 transition-transform"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
                aria-expanded={open}
                aria-controls="mobile-drawer"
              >
                {open ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobil slide-in drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[55] transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        {open && (
        <FocusTrap active={open} onEscape={() => setOpen(false)}>
        <aside
          id="mobile-drawer"
          className={cn(
            'absolute right-0 top-0 bottom-0 w-[86%] max-w-[360px] bg-[color:var(--bg-elev)] border-l border-[color:var(--border)] shadow-2xl',
            'flex flex-col safe-top safe-bottom',
            'transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : 'translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Ana menü"
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <Logo size="sm" />
            <button
              onClick={() => setOpen(false)}
              aria-label="Kapat"
              className="touch-target size-10 rounded-xl hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>

          {/* User card */}
          {isAuthenticated && user ? (
            <div className="mx-4 mt-4 rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/10 to-transparent p-4 flex items-center gap-3">
              <img src={user.avatar ?? ''} alt="" width={44} height={44} className="size-11 rounded-full object-cover bg-gold-400/20" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{user.name}</div>
                <div className="text-[11px] text-[color:var(--fg-muted)] truncate">{user.email}</div>
              </div>
              <button
                onClick={signOut}
                aria-label="Çıkış"
                className="size-9 rounded-lg hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center text-danger"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/sign-in"
              className="mx-4 mt-4 rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/10 to-transparent p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="size-11 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 flex items-center justify-center font-bold">
                <UserIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Giriş yap veya kayıt ol</div>
                <div className="text-[11px] text-[color:var(--fg-muted)]">AI eşleşme ve favoriler için</div>
              </div>
              <ChevronRight size={16} className="text-[color:var(--fg-muted)]" />
            </Link>
          )}

          {/* Primary nav */}
          <nav className="px-3 py-4 flex-1 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--fg-faint)] px-3 mb-1.5">Keşfet</div>
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors',
                    active ? 'bg-gold-400/15 text-gold-300' : 'hover:bg-[color:var(--bg-card-hover)]',
                  )}
                >
                  <item.i size={18} className={active ? 'text-gold-300' : 'text-[color:var(--fg-muted)]'} />
                  <span className="flex-1">{t(item.key)}</span>
                  <ChevronRight size={14} className="text-[color:var(--fg-faint)]" />
                </Link>
              );
            })}

            <div className="text-[10px] uppercase tracking-wider text-[color:var(--fg-faint)] px-3 mb-1.5 mt-4">Hesap</div>
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[color:var(--bg-card-hover)]">
              <UserIcon size={18} className="text-[color:var(--fg-muted)]" />
              <span className="flex-1 text-[15px] font-medium">Panelim</span>
              <ChevronRight size={14} className="text-[color:var(--fg-faint)]" />
            </Link>
            {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator') && (
              <Link href="/admin" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[color:var(--bg-card-hover)]">
                <ShieldCheck size={18} className="text-gold-300" />
                <span className="flex-1 text-[15px] font-medium text-gold-300">Admin Konsolu</span>
                <ChevronRight size={14} className="text-[color:var(--fg-faint)]" />
              </Link>
            )}

            <div className="text-[10px] uppercase tracking-wider text-[color:var(--fg-faint)] px-3 mb-1.5 mt-4">Ayarlar</div>
            <div className="px-3 py-2.5 rounded-xl flex items-center justify-between">
              <span className="inline-flex items-center gap-3 text-[15px] font-medium">
                <Settings size={18} className="text-[color:var(--fg-muted)]" /> Tema
              </span>
              <ThemeToggle />
            </div>
            <div className="px-3 py-2.5 rounded-xl">
              <div id="lang-label" className="text-[15px] font-medium mb-2">Dil</div>
              <div role="radiogroup" aria-labelledby="lang-label" className="flex gap-1.5">
                {SUPPORTED_LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={lang === l}
                    onClick={() => setLang(l)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs font-medium',
                      lang === l
                        ? 'bg-gold-400/15 border-gold-400 text-gold-300'
                        : 'border-[color:var(--border)]',
                    )}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Bottom CTA */}
          <div className="p-4 border-t bg-[color:var(--bg-elev)]">
            <Link href="/new-listing">
              <Button variant="gold" size="lg" className="w-full gap-2">
                <Plus size={16} /> {t('nav.new_listing')}
              </Button>
            </Link>
          </div>
        </aside>
        </FocusTrap>
        )}
      </div>
    </>
  );
}
