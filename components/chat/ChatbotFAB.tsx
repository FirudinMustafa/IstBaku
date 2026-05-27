'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, X, Send, Sparkles, ChevronDown, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FocusTrap } from '@/components/ui/FocusTrap';
import { cn, sleep } from '@/lib/utils';
import { respond, buildWelcome, type ChatMessage } from '@/lib/chatbot';
import { useLang } from '@/components/layout/LangProvider';

export function ChatbotFAB() {
  const pathname = usePathname();
  const { lang, t } = useLang();
  // Admin sayfalarında gizle (orada zaten admin'in kendi araçları var)
  const hidden = pathname.startsWith('/admin');
  // Property sayfasında mobil action bar bizden daha öncelikli; FAB'i yukarı it
  const onPropertyPage = pathname.startsWith('/property/');

  const [open, setOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  // PB-07: seed messages with the welcome built for the active language so the
  // very first impression matches the user's locale. When the user switches
  // language we also refresh the welcome so the chat header bubble stays in
  // sync (only when it's still the lone seeded message).
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [buildWelcome(lang)]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages((cur) => {
      if (cur.length === 1 && cur[0].id === 'welcome') return [buildWelcome(lang)];
      return cur;
    });
  }, [lang]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, at: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    await sleep(550 + Math.random() * 400);
    const res = respond(content, lang);
    setMessages((m) => [
      ...m,
      { id: `a-${Date.now()}`, role: 'assistant', content: res.content, actions: res.actions, followups: res.followups, at: Date.now() },
    ]);
    setBusy(false);
  }

  function reset() {
    setMessages([buildWelcome(lang)]);
    setInput('');
  }

  if (hidden) return null;

  return (
    <>
      {/* Floating Action Button — mobilde bottom-nav'in üstünde */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          aria-label={t('chat.open')}
          className={cn(
            'fixed z-[60] inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900',
            'shadow-[0_10px_30px_-8px_rgba(212,168,67,0.6)] hover:scale-105 active:scale-95 transition-transform animate-pulse-glow',
            // Mobil: küçük circular FAB, bottom-nav (4rem) + safe-area üstünde
            'size-14 justify-center md:size-auto md:px-4 md:h-12',
            'right-4 md:right-5',
            // Mobile: property sayfasında action bar (h-14, bottom-16) üzerine çıkar; diğerlerinde bottom-nav üstü
            onPropertyPage
              ? 'bottom-[calc(9rem+env(safe-area-inset-bottom))] md:bottom-5'
              : 'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5',
          )}
        >
          <MessageSquare size={22} className="md:hidden" />
          <MessageSquare size={18} className="hidden md:inline" />
          <span className="hidden md:inline font-semibold text-sm">{t('chat.assistant')}</span>
        </button>
      )}

      {/* Sohbet paneli — mobilde full bottom-sheet, desktop'ta sağ-alt kart */}
      {open && (
        <>
          {/* Mobil backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        <FocusTrap active={open} onEscape={() => setOpen(false)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('chat.title')}
          className={cn(
            'fixed z-[60] flex flex-col bg-[color:var(--bg-card)] border border-[color:var(--border-strong)] shadow-2xl transition-all',
            // Mobile: full-height bottom sheet
            'inset-x-0 bottom-0 h-[88vh] max-h-[88vh] rounded-t-3xl rounded-b-none',
            // Desktop: floating card
            'md:left-auto md:inset-x-auto md:right-5 md:bottom-5 md:w-[400px] md:h-auto md:max-h-[640px] md:rounded-2xl',
            minimized && 'md:h-14 md:max-h-14 md:overflow-hidden',
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Mobil drag handle */}
          <div className="md:hidden pt-2.5 pb-1 flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-[color:var(--border-strong)]" />
          </div>
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3 bg-[color:var(--bg-elev)] md:rounded-t-2xl">
            <div className="size-9 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                ISTBAKU AI
                <Badge variant="success" className="!py-0 !text-[9px]">● {t('chat.online')}</Badge>
              </div>
              <div className="text-[10px] text-[color:var(--fg-muted)] truncate">{t('chat.subtitle')}</div>
            </div>
            <button onClick={reset} aria-label={t('chat.reset')} className="size-8 rounded-lg hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center text-[color:var(--fg-muted)]">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => setMinimized((v) => !v)} aria-label={minimized ? t('chat.maximize') : t('chat.minimize')} className="hidden sm:flex size-8 rounded-lg hover:bg-[color:var(--bg-card-hover)] items-center justify-center text-[color:var(--fg-muted)]">
              <ChevronDown size={14} className={minimized ? 'rotate-180' : ''} />
            </button>
            <button onClick={() => setOpen(false)} aria-label={t('chat.close')} className="size-8 rounded-lg hover:bg-[color:var(--bg-card-hover)] flex items-center justify-center text-[color:var(--fg-muted)]">
              <X size={14} />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Mesajlar */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className="max-w-[88%]">
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-relaxed',
                          m.role === 'user'
                            ? 'bg-gold-400/15 text-[color:var(--fg)] rounded-tr-sm border border-gold-400/30'
                            : 'glass rounded-tl-sm',
                        )}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                      />
                      {m.actions && m.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.actions.map((a) => (
                            <Link
                              key={a.label}
                              href={a.href}
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 border border-gold-400/40 text-gold-300 px-3 py-1 text-xs hover:bg-gold-400/25"
                            >
                              {a.label} <ArrowUpRight size={11} />
                            </Link>
                          ))}
                        </div>
                      )}
                      {m.followups && m.followups.length > 0 && i === messages.length - 1 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {m.followups.map((f) => (
                            <button
                              key={f}
                              onClick={() => send(f)}
                              className="text-left text-xs rounded-lg border px-2.5 py-1.5 hover:border-gold-400/60 hover:text-gold-300 transition-colors"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                      <span className="size-1.5 bg-gold-400 rounded-full animate-pulse" />
                      <span className="size-1.5 bg-gold-400 rounded-full animate-pulse [animation-delay:120ms]" />
                      <span className="size-1.5 bg-gold-400 rounded-full animate-pulse [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="p-3 border-t flex items-center gap-2 bg-[color:var(--bg-elev)] md:rounded-b-2xl"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  aria-label={t('chat.input.label')}
                  maxLength={2000}
                  className="flex-1 h-10 px-3 rounded-full bg-[color:var(--bg-card)] border focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                />
                <Button type="submit" variant="gold" size="icon" disabled={!input.trim() || busy} aria-label={t('chat.send')}>
                  <Send size={14} />
                </Button>
              </form>
            </>
          )}
        </div>
        </FocusTrap>
        </>
      )}
    </>
  );
}

/** Çok basit markdown: **bold** */
function renderMarkdown(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gold-300">$1</strong>');
}
