'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft, MessageSquare, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { timeAgo, cn } from '@/lib/utils';
import {
  type ThreadSummary, type MessageRow,
  getThreadMessages, sendMessageAction, markThreadReadAction,
} from '@/lib/message-actions';
import { messageSchema, fieldErrors } from '@/lib/schemas';

interface Props {
  threads: ThreadSummary[];
  initialThreadId: string | null;
  meId: string;
}

export function MessagesClient({ threads: initialThreads, initialThreadId, meId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [threads, setThreads] = React.useState(initialThreads);
  const [activeId, setActiveId] = React.useState<string | null>(
    initialThreadId ?? initialThreads[0]?.id ?? null,
  );
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const active = threads.find((t) => t.id === activeId);

  // Load messages when active thread changes
  React.useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    let cancelled = false;
    getThreadMessages(activeId).then((rows) => {
      if (cancelled) return;
      setMessages(rows);
      setLoading(false);
      // Mark thread read
      markThreadReadAction(activeId).then(() => {
        setThreads((cur) => cur.map((t) => t.id === activeId ? { ...t, unread: 0 } : t));
      });
    });
    return () => { cancelled = true; };
  }, [activeId]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    if (!active) return;
    // MC-14: validate via zod schema before submitting.
    const parsed = messageSchema.safeParse({
      toUserId: active.otherId,
      content: draft,
      listingId: active.listingId ?? undefined,
      listingTitle: active.listingTitle ?? undefined,
    });
    if (!parsed.success) {
      const errs = fieldErrors(parsed);
      toast({ variant: 'error', title: errs.content ?? 'Mesaj geçersiz' });
      return;
    }
    setSending(true);
    const res = await sendMessageAction(parsed.data);
    setSending(false);
    if (!res.ok) {
      toast({ variant: 'error', title: 'Gönderilemedi', description: res.error });
      return;
    }
    setDraft('');
    // Reload thread messages
    const rows = await getThreadMessages(active.id);
    setMessages(rows);
    // Update preview
    setThreads((cur) => cur.map((t) => t.id === active.id
      ? { ...t, lastMessage: draft.trim(), lastMessageAt: new Date().toISOString() }
      : t,
    ));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
          <MessageSquare size={20} className="text-gold-300" /> Mesajlar
        </h1>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">İlanlar üzerinden başlattığın tüm konuşmalar.</p>
      </div>

      {threads.length === 0 ? (
        <Card><CardBody className="text-center py-16">
          <MessageSquare size={32} className="mx-auto text-gold-300/60" />
          <p className="mt-3 font-medium">Henüz hiç mesajın yok</p>
          <p className="text-sm text-[color:var(--fg-muted)] mt-1">İlan sayfasındaki "Mesaj Gönder" butonuyla bir konuşma başlatabilirsin.</p>
          <Link href="/listings"><Button variant="gold" className="mt-4">İlanlara Göz At</Button></Link>
        </CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 grid grid-cols-1 md:grid-cols-[320px_1fr] divide-y md:divide-y-0 md:divide-x" style={{ minHeight: '60vh' }}>
            {/* Thread list */}
            <div className={cn('md:max-h-[70vh] overflow-y-auto', activeId && 'hidden md:block')}>
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    'w-full text-left p-3 border-b hover:bg-[color:var(--bg-card-hover)]',
                    activeId === t.id && 'bg-[color:var(--bg-elev)]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {t.otherAvatar && <img src={t.otherAvatar} alt="" width={40} height={40} className="size-10 rounded-full object-cover bg-gold-400/20" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate text-sm">{t.otherName}</div>
                        <span className="text-[10px] text-[color:var(--fg-faint)] shrink-0">{timeAgo(t.lastMessageAt)}</span>
                      </div>
                      <div className="text-xs text-[color:var(--fg-muted)] truncate mt-0.5">{t.lastMessage}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {t.listingTitle && (
                          <Badge variant="outline" className="!text-[10px] !py-0">{t.listingTitle.slice(0, 24)}{t.listingTitle.length > 24 ? '…' : ''}</Badge>
                        )}
                        {t.unread > 0 && (
                          <Badge variant="gold" className="!text-[10px] !py-0">{t.unread} yeni</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Conversation */}
            <div className={cn('flex flex-col', !activeId && 'hidden md:flex')}>
              {!active ? (
                <div className="flex-1 flex items-center justify-center text-[color:var(--fg-muted)]">
                  Bir konuşma seç →
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center gap-3">
                    <button onClick={() => setActiveId(null)} className="md:hidden">
                      <ArrowLeft size={18} />
                    </button>
                    {active.otherAvatar && <img src={active.otherAvatar} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{active.otherName}</div>
                      {active.listingSlug && active.listingTitle && (
                        <Link href={`/property/${active.listingSlug}`} className="text-xs text-gold-300 hover:underline inline-flex items-center gap-1">
                          {active.listingTitle.slice(0, 50)}{active.listingTitle.length > 50 ? '…' : ''} <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '50vh' }}>
                    {loading ? (
                      <div className="text-center text-[color:var(--fg-muted)] text-sm">Yükleniyor…</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-[color:var(--fg-muted)] text-sm">Bu konuşma boş. İlk mesajı sen at!</div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.senderId === meId;
                        return (
                          <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                                mine
                                  ? 'bg-gold-400 text-navy-900 rounded-br-sm'
                                  : 'bg-[color:var(--bg-elev)] border rounded-bl-sm',
                              )}
                            >
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                              <div className={cn('text-[10px] mt-1', mine ? 'text-navy-700/70' : 'text-[color:var(--fg-faint)]')}>
                                {new Date(m.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                                {mine && (m.read ? ' · okundu' : ' · iletildi')}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="border-t p-3 flex items-end gap-2">
                    <Textarea
                      id="message-compose"
                      aria-label={`${active.otherName} için mesaj yaz`}
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Mesajını yaz…"
                      maxLength={4000}
                      className="!min-h-[44px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                    <Button variant="gold" size="md" onClick={send} loading={sending} className="!h-11 shrink-0">
                      <Send size={14} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
