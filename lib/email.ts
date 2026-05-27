import 'server-only';
import { Resend } from 'resend';
import { stripCrlf } from './security';

const apiKey = process.env.RESEND_API_KEY;
const fromAddr = process.env.EMAIL_FROM ?? 'ISTBAKU <noreply@istbaku.com>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const client = apiKey ? new Resend(apiKey) : null;

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  silent?: boolean;
}

/** HTML'den okunabilir plain-text alternatif üretir (deliverability için kritik). */
function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  // MC-26 / MH-12: strip CR/LF + bidi marks from headers so user-supplied
  // subjects / recipient addresses cannot inject extra SMTP headers.
  const safeSubject = stripCrlf(args.subject).slice(0, 256);
  const safeTo = stripCrlf(args.to);
  // Basic recipient sanity check — must look like an email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeTo)) {
    return { ok: false, error: 'Invalid recipient' };
  }

  // Mask email addresses in logs to avoid PII leakage
  const masked = safeTo.replace(/(.{2}).*(@.*)/, '$1***$2');

  if (!client) {
    console.warn('[email] RESEND_API_KEY missing — gönderilmedi:', safeSubject, '→', masked);
    return { ok: false, error: 'RESEND_API_KEY missing' };
  }
  try {
    const text = args.text ?? htmlToText(args.html);
    const r = await client.emails.send({
      from: fromAddr,
      to: safeTo,
      subject: safeSubject,
      html: args.html,
      text,
      replyTo: process.env.EMAIL_REPLY_TO ?? 'destek@istbaku.com',
      headers: {
        'List-Unsubscribe': `<${appUrl}/dashboard?tab=notifications>, <mailto:unsubscribe@istbaku.com>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `istbaku-${Date.now()}`,
      },
    }) as { data?: { id?: string } | null; error?: unknown };
    if (r.error) {
      const err = typeof r.error === 'string' ? r.error : JSON.stringify(r.error);
      console.error('[email] gönderim hatası', err, '→', masked);
      return { ok: false, error: err };
    }
    console.log('[email] ✓ gönderildi', r.data?.id, '→', masked);
    return { ok: true, id: r.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] beklenmedik hata', msg);
    if (!args.silent) throw err;
    return { ok: false, error: msg };
  }
}

// ============================================================
// Design tokens
// ============================================================

const C = {
  orange:      '#CAAE99',
  orangeDark:  '#b8977d',
  orangeLight: '#e3d6c8',
  amber:       '#b8977d',
  navy900:     '#0a1320',
  navy800:     '#121F30',
  navy700:     '#1e3148',
  navy600:     '#2a4360',
  navy500:     '#365578',
  text:        '#e8eef7',
  textMuted:   '#93a4bf',
  textFaint:   '#5b6b80',
  border:      '#1e3148',
  borderSoft:  '#142d4a',
  success:     '#10b981',
  danger:      '#ef4444',
  white:       '#ffffff',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// Shell — modern, Outlook-compatible, dark theme
// ============================================================

interface ShellOpts {
  preheader?: string;
  /** Hero emoji veya ikon (büyük, üst orta) */
  heroIcon?: string;
  /** Hero altında 1 satırlık vurgu */
  heroEyebrow?: string;
  /** Ana başlık — H1 */
  title: string;
  /** Açıklama paragrafı */
  intro?: string;
  /** Asıl body — HTML (kart, liste, bilgi kutusu vb.) */
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** İkincil link (CTA altında) */
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  /** Sarı/turuncu öneri kutusu (footer üstünde) */
  tipBox?: { title: string; body: string };
  /** Footer notu (gri kutu, fine print) */
  footerNote?: string;
}

export function emailShell({
  preheader, heroIcon, heroEyebrow, title, intro, bodyHtml,
  ctaLabel, ctaUrl, secondaryCtaLabel, secondaryCtaUrl, tipBox, footerNote,
}: ShellOpts): string {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: 'Segoe UI', Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    @media (max-width: 600px) {
      .container { width: 100% !important; }
      .px-mobile { padding-left: 20px !important; padding-right: 20px !important; }
      .hero-title { font-size: 26px !important; line-height: 1.25 !important; }
      .stack-col { display: block !important; width: 100% !important; padding-bottom: 12px !important; }
      .cta-btn { font-size: 15px !important; padding: 14px 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.navy900};font-family:'Inter','Segoe UI',Arial,sans-serif;color:${C.text};-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:transparent;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.navy900};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- =========== Top brand strip =========== -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 4px 14px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1;">
                    <span style="color:${C.orange};">IST</span><span style="color:${C.white};">BAKU</span>
                  </td>
                  <td align="right" style="font-size:10px;color:${C.textMuted};letter-spacing:0.18em;text-transform:uppercase;">
                    ISTBAKU
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- =========== Main card =========== -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;width:100%;background:${C.navy800};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">

          <!-- Hero band: orange→navy gradient -->
          <tr>
            <td style="background:${C.orange};background-image:linear-gradient(135deg, ${C.orange} 0%, ${C.orangeDark} 50%, ${C.navy600} 100%);padding:40px 32px;text-align:center;" class="px-mobile" bgcolor="${C.orange}">
              ${heroIcon ? `<div style="font-size:44px;line-height:1;margin-bottom:6px;">${heroIcon}</div>` : ''}
              ${heroEyebrow ? `<div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,0.25);padding:6px 14px;border-radius:999px;margin-bottom:14px;">${escapeHtml(heroEyebrow)}</div>` : ''}
              <h1 class="hero-title" style="margin:0;font-size:30px;line-height:1.2;color:${C.white};font-weight:800;letter-spacing:-0.02em;text-shadow:0 2px 12px rgba(0,0,0,0.18);">${escapeHtml(title)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="px-mobile" style="padding:32px;">
              ${intro ? `<p style="margin:0 0 22px;color:${C.textMuted};font-size:15px;line-height:1.65;">${intro}</p>` : ''}
              ${bodyHtml ? `<div style="color:${C.text};font-size:15px;line-height:1.7;">${bodyHtml}</div>` : ''}

              ${ctaUrl && ctaLabel ? `
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
                  <tr>
                    <td style="border-radius:10px;background:${C.orange};background-image:linear-gradient(180deg, ${C.orange} 0%, ${C.orangeDark} 100%);box-shadow:0 6px 16px -6px rgba(202,174,153,0.55);" bgcolor="${C.orange}">
                      <a href="${escapeHtml(ctaUrl)}" class="cta-btn" style="display:inline-block;font-family:'Inter','Segoe UI',Arial,sans-serif;color:${C.navy900};font-weight:800;text-decoration:none;padding:15px 32px;border-radius:10px;font-size:15px;letter-spacing:0.01em;">
                        ${escapeHtml(ctaLabel)} &nbsp;›
                      </a>
                    </td>
                  </tr>
                </table>
                ${secondaryCtaUrl && secondaryCtaLabel ? `
                  <p style="margin:14px 0 0;font-size:13px;">
                    <a href="${escapeHtml(secondaryCtaUrl)}" style="color:${C.orangeLight};text-decoration:none;font-weight:600;">${escapeHtml(secondaryCtaLabel)} ›</a>
                  </p>
                ` : ''}
                <p style="margin:18px 0 0;font-size:11px;color:${C.textFaint};word-break:break-all;line-height:1.5;">
                  Buton çalışmazsa şu linki tarayıcına yapıştır:<br/>
                  <a href="${escapeHtml(ctaUrl)}" style="color:${C.orangeLight};text-decoration:none;">${escapeHtml(ctaUrl)}</a>
                </p>
              ` : ''}
            </td>
          </tr>

          ${tipBox ? `
          <tr>
            <td class="px-mobile" style="padding:0 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;">
                <tr>
                  <td style="background:${C.navy700};border-left:3px solid ${C.amber};border-radius:10px;padding:14px 18px;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.amber};margin-bottom:4px;">${escapeHtml(tipBox.title)}</div>
                    <div style="color:${C.text};font-size:13px;line-height:1.6;">${tipBox.body}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          ${footerNote ? `
          <tr>
            <td class="px-mobile" style="padding:0 32px 24px;">
              <p style="margin:0;font-size:11px;color:${C.textMuted};line-height:1.6;padding:12px 14px;background:${C.navy700};border-radius:8px;border:1px solid ${C.borderSoft};">
                ${footerNote}
              </p>
            </td>
          </tr>` : ''}

          <!-- Help / contact band -->
          <tr>
            <td class="px-mobile" style="padding:24px 32px;background:${C.navy900};border-top:1px solid ${C.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:13px;color:${C.text};font-weight:600;padding-bottom:4px;">Yardıma mı ihtiyacın var?</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:${C.textMuted};line-height:1.6;">
                    Bize <a href="mailto:destek@istbaku.com" style="color:${C.orangeLight};text-decoration:none;font-weight:600;">destek@istbaku.com</a> üzerinden yazabilir veya
                    <a href="${escapeHtml(appUrl)}/legal-guide" style="color:${C.orangeLight};text-decoration:none;font-weight:600;">hukuki rehberlere</a> göz atabilirsin.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- =========== Footer =========== -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;width:100%;margin-top:18px;">
          <tr>
            <td align="center" style="padding:6px 20px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 8px;">
                    <a href="${escapeHtml(appUrl)}/listings" style="font-size:11px;color:${C.textMuted};text-decoration:none;">İlanlar</a>
                  </td>
                  <td style="color:${C.textFaint};">·</td>
                  <td style="padding:0 8px;">
                    <a href="${escapeHtml(appUrl)}/ai-match" style="font-size:11px;color:${C.textMuted};text-decoration:none;">AI Eşleşme</a>
                  </td>
                  <td style="color:${C.textFaint};">·</td>
                  <td style="padding:0 8px;">
                    <a href="${escapeHtml(appUrl)}/reports" style="font-size:11px;color:${C.textMuted};text-decoration:none;">Raporlar</a>
                  </td>
                  <td style="color:${C.textFaint};">·</td>
                  <td style="padding:0 8px;">
                    <a href="${escapeHtml(appUrl)}/legal-guide" style="font-size:11px;color:${C.textMuted};text-decoration:none;">Hukuk</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 24px 0;">
              <div style="font-size:11px;color:${C.textFaint};line-height:1.7;">
                © ${new Date().getFullYear()} ISTBAKU — Yatırım odaklı emlak platformu.
                <br/>
                Bu mail ISTBAKU hesabınla ilgili bir aksiyon nedeniyle gönderildi.
                <a href="${escapeHtml(appUrl)}/dashboard?tab=notifications" style="color:${C.textMuted};">Tercihler</a> ·
                <a href="${escapeHtml(appUrl)}" style="color:${C.textMuted};">${escapeHtml(appUrl.replace(/^https?:\/\//, ''))}</a>
              </div>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================
// Reusable body blocks
// ============================================================

function metricCard(label: string, value: string, accent = C.orange): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.navy700};border:1px solid ${C.border};border-radius:10px;">
    <tr>
      <td style="padding:14px 16px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.textMuted};margin-bottom:6px;">${label}</div>
        <div style="font-size:20px;font-weight:800;color:${accent};letter-spacing:-0.01em;">${value}</div>
      </td>
    </tr>
  </table>`;
}

function checkList(items: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 0;">${items.map((t) => `
    <tr>
      <td valign="top" style="padding:6px 12px 6px 0;width:24px;">
        <div style="display:inline-block;width:18px;height:18px;border-radius:999px;background:${C.orange};color:${C.navy900};font-weight:800;font-size:11px;line-height:18px;text-align:center;">✓</div>
      </td>
      <td valign="top" style="padding:6px 0;color:${C.text};font-size:14px;line-height:1.6;">${t}</td>
    </tr>`).join('')}
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;color:${C.textMuted};font-size:13px;width:130px;">${label}</td>
    <td style="padding:9px 0;color:${C.text};font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

// ============================================================
// Templates
// ============================================================

export function tplVerifyEmail({ name, code }: { name: string; code: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  const codeChars = code.split('').map((d) => `<span style="display:inline-block;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:34px;font-weight:800;color:${C.navy900};background:${C.white};padding:14px 0;width:48px;text-align:center;border-radius:10px;margin:0 4px;box-shadow:0 4px 10px -4px rgba(0,0,0,0.45);letter-spacing:0;">${escapeHtml(d)}</span>`).join('');
  return emailShell({
    preheader: `Doğrulama kodun: ${code}`,
    heroIcon: '🔑',
    heroEyebrow: 'Doğrulama Kodu',
    title: `Hoş geldin ${firstName}`,
    intro: 'ISTBAKU hesabını aktifleştirmek için aşağıdaki <strong style="color:#fff;">6 haneli kodu</strong> kayıt sayfasında gir.',
    bodyHtml: `
      <div style="text-align:center;margin:8px 0 4px;padding:24px 12px;background:${C.navy700};border:1px solid ${C.border};border-radius:14px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${C.textMuted};margin-bottom:14px;">Doğrulama Kodu</div>
        <div style="white-space:nowrap;">${codeChars}</div>
        <div style="margin-top:18px;font-size:12px;color:${C.textMuted};">Kod <strong style="color:${C.amber};">15 dakika</strong> geçerli ve tek kullanımlıktır.</div>
      </div>`,
    tipBox: {
      title: 'Güvenlik',
      body: 'Bu kodu kimseyle paylaşma. ISTBAKU çalışanları senden asla kod istemez. Talebi sen başlatmadıysan bu maili görmezden gelebilirsin.',
    },
  });
}

export function tplWelcome({ name }: { name: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  return emailShell({
    preheader: 'Panelin aktif. Hadi yatırıma başlayalım.',
    heroIcon: '🎉',
    heroEyebrow: 'Hesabın Hazır',
    title: `Aramıza hoş geldin, ${firstName}`,
    intro: `E-postan doğrulandı, panelin aktif. İlk <strong style="color:${C.text};">5 dakikada</strong> şunları yapmanı öneririz:`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;">
        <tr><td style="padding-bottom:10px;">${stepBlock('1', 'AI Eşleşme', 'Hedefini söyle — sana özel 5 ilan üretelim.')}</td></tr>
        <tr><td style="padding-bottom:10px;">${stepBlock('2', 'Kayıtlı arama', 'Bölge + bütçe filtresini kaydet, yeni eşleşmelerde anında haber al.')}</td></tr>
        <tr><td>${stepBlock('3', 'Karşılaştırma', 'En fazla 3 ilanı yan yana koy, AI skor + m² fiyatına göre seç.')}</td></tr>
      </table>`,
    ctaLabel: 'Panele Geç',
    ctaUrl: `${appUrl}/dashboard`,
    secondaryCtaLabel: 'AI Eşleşme\'yi başlat',
    secondaryCtaUrl: `${appUrl}/ai-match`,
  });
}

function stepBlock(num: string, title: string, desc: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.navy700};border:1px solid ${C.border};border-radius:10px;">
    <tr>
      <td valign="top" style="padding:14px 14px 14px 16px;width:38px;">
        <div style="width:30px;height:30px;line-height:30px;border-radius:999px;background:${C.orange};color:${C.navy900};font-weight:800;font-size:13px;text-align:center;">${num}</div>
      </td>
      <td valign="top" style="padding:14px 16px 14px 0;">
        <div style="font-size:14px;font-weight:700;color:${C.text};margin-bottom:2px;">${title}</div>
        <div style="font-size:13px;color:${C.textMuted};line-height:1.55;">${desc}</div>
      </td>
    </tr>
  </table>`;
}

export function tplPasswordReset({ name, resetUrl }: { name: string; resetUrl: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  return emailShell({
    preheader: 'Şifre sıfırlama linkin geldi — 1 saat geçerli.',
    heroIcon: '🔐',
    heroEyebrow: 'Şifre Sıfırlama',
    title: 'Şifreni sıfırla',
    intro: `Merhaba ${firstName}, hesabın için bir şifre sıfırlama isteği aldık. Aşağıdaki butonla yeni bir şifre belirleyebilirsin.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="background:${C.navy700};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.textMuted};margin-bottom:4px;">Bağlantı süresi</div>
            <div style="font-size:18px;font-weight:800;color:${C.orange};">1 saat</div>
          </td>
        </tr>
      </table>`,
    ctaLabel: 'Şifreyi Sıfırla',
    ctaUrl: resetUrl,
    tipBox: {
      title: 'Bilgi',
      body: 'İşlemi sen başlatmadıysan bu maili görmezden gelebilirsin. ISTBAKU çalışanları senden asla şifre, tek-kullanımlık kod veya kart bilgisi istemez.',
    },
  });
}

export function tplNewMessage({
  recipientName, senderName, snippet, listingTitle, threadUrl,
}: { recipientName: string; senderName: string; snippet: string; listingTitle?: string; threadUrl: string }) {
  // MC-26: caller is expected to pre-sanitize names; we also pass them
  // through escapeHtml here so a future caller that forgets cannot inject.
  void recipientName;
  const safeSender = escapeHtml(senderName);
  return emailShell({
    preheader: `${safeSender} sana ISTBAKU üzerinden mesaj gönderdi.`,
    heroIcon: '💬',
    heroEyebrow: 'Yeni Mesaj',
    title: `${escapeHtml(senderName)} sana yazdı`,
    intro: listingTitle
      ? `<strong style="color:${C.text};">${escapeHtml(listingTitle)}</strong> ilanı hakkında yeni bir mesajın var.`
      : 'ISTBAKU üzerinden yeni bir konuşma başladı.',
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="background:${C.navy700};border-left:4px solid ${C.orange};border-radius:10px;padding:18px 20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.orangeLight};margin-bottom:8px;">${escapeHtml(senderName)}</div>
            <div style="color:${C.text};font-size:15px;line-height:1.6;font-style:italic;">"${escapeHtml(snippet)}"</div>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:${C.textMuted};font-size:13px;line-height:1.6;">Tüm konuşma ISTBAKU üzerinde kayıt altında tutulur, KVKK uyumludur.</p>`,
    ctaLabel: 'Mesajı Yanıtla',
    ctaUrl: threadUrl,
  });
}

export function tplAppointmentVisitor({
  visitorName, agentName, listingTitle, when, propertyUrl,
}: { visitorName: string; agentName: string; listingTitle: string; when: Date; propertyUrl: string }) {
  const dateStr = when.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = when.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const firstName = escapeHtml(visitorName.split(' ')[0]);
  return emailShell({
    preheader: `Gezinti randevun onaylandı — ${dateStr} ${timeStr}`,
    heroIcon: '📅',
    heroEyebrow: 'Randevu Onaylandı',
    title: `${firstName}, randevun hazır`,
    intro: `<strong style="color:${C.text};">${escapeHtml(listingTitle)}</strong> ilanı için ${escapeHtml(agentName)} ile gezinti randevun oluşturuldu.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;">
        <tr>
          <td class="stack-col" style="padding:0 6px 0 0;width:50%;">
            ${metricCard('Tarih', dateStr)}
          </td>
          <td class="stack-col" style="padding:0 0 0 6px;width:50%;">
            ${metricCard('Saat', timeStr, C.amber)}
          </td>
        </tr>
      </table>`,
    ctaLabel: 'İlanı Aç',
    ctaUrl: propertyUrl,
    secondaryCtaLabel: 'Randevuyu panelden takip et',
    secondaryCtaUrl: `${appUrl}/dashboard`,
    tipBox: {
      title: 'Önemli',
      body: `İptal veya değişiklik için randevudan en az 2 saat önce ${escapeHtml(agentName)} ile iletişime geç.`,
    },
  });
}

export function tplAppointmentAgent({
  agentName, visitorName, visitorEmail, visitorPhone, listingTitle, when, dashboardUrl,
}: { agentName: string; visitorName: string; visitorEmail: string; visitorPhone?: string; listingTitle: string; when: Date; dashboardUrl: string }) {
  const dateStr = when.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = when.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return emailShell({
    preheader: 'Yeni gezinti talebi geldi.',
    heroIcon: '🏠',
    heroEyebrow: 'Yeni Lead',
    title: `${escapeHtml(visitorName)} ile randevu`,
    intro: `<strong style="color:${C.text};">${escapeHtml(listingTitle)}</strong> için bir ziyaretçi randevu oluşturdu. Detaylar aşağıda.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.navy700};border:1px solid ${C.border};border-radius:10px;">
        <tr><td style="padding:8px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${infoRow('Tarih', dateStr)}
            ${infoRow('Saat', `<span style="color:${C.orange};">${timeStr}</span>`)}
            ${infoRow('İsim', escapeHtml(visitorName))}
            ${infoRow('E-posta', `<a href="mailto:${escapeHtml(visitorEmail)}" style="color:${C.orangeLight};text-decoration:none;">${escapeHtml(visitorEmail)}</a>`)}
            ${visitorPhone ? infoRow('Telefon', `<a href="tel:${escapeHtml(visitorPhone)}" style="color:${C.orangeLight};text-decoration:none;">${escapeHtml(visitorPhone)}</a>`) : ''}
          </table>
        </td></tr>
      </table>`,
    ctaLabel: 'CRM Panelde Aç',
    ctaUrl: dashboardUrl,
  });
}

export function tplListingApproved({ agentName, listingTitle, listingUrl, level }: { agentName: string; listingTitle: string; listingUrl: string; level: number }) {
  const firstName = escapeHtml(agentName.split(' ')[0] || 'Emlakçı');
  return emailShell({
    preheader: 'İlanın artık ISTBAKU Onaylı olarak yayında.',
    heroIcon: '✅',
    heroEyebrow: 'İlan Yayında',
    title: `Tebrikler ${firstName}!`,
    intro: `<strong style="color:${C.text};">${escapeHtml(listingTitle)}</strong> moderasyon sürecinden başarıyla geçti. Artık aramada ve favori toplamada aktif.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;">
        <tr>
          <td class="stack-col" style="padding:0 6px 0 0;width:50%;">
            ${metricCard('Onay Seviyesi', `Seviye ${level}`, C.success)}
          </td>
          <td class="stack-col" style="padding:0 0 0 6px;width:50%;">
            ${metricCard('Etkileşim', '+%38 tıklama', C.orange)}
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;color:${C.textMuted};font-size:14px;line-height:1.6;">
        ISTBAKU Onaylı rozeti yatırımcılarda <strong style="color:${C.text};">ortalama %38 daha fazla tıklama</strong> ile ilişkilendirilir.
      </p>`,
    ctaLabel: 'İlanı Görüntüle',
    ctaUrl: listingUrl,
  });
}

export function tplListingRejected({ agentName, listingTitle, reason, dashboardUrl }: { agentName: string; listingTitle: string; reason?: string; dashboardUrl: string }) {
  const firstName = escapeHtml(agentName.split(' ')[0] || 'Emlakçı');
  return emailShell({
    preheader: 'İlanın moderasyon sürecinden geçemedi.',
    heroIcon: '⚠️',
    heroEyebrow: 'İnceleme Gerekiyor',
    title: 'İlanın yayınlanmadı',
    intro: `Merhaba ${firstName}, <strong style="color:${C.text};">${escapeHtml(listingTitle)}</strong> ekibimizin kalite kontrolünden geçemedi. Düzelttikten sonra panelden tekrar gönderebilirsin.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="background:${C.navy700};border-left:4px solid ${C.danger};border-radius:10px;padding:16px 18px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.danger};margin-bottom:6px;">Red Sebebi</div>
            <div style="color:${C.text};font-size:14px;line-height:1.6;">${reason ? escapeHtml(reason) : 'Bilgiler eksik veya görseller yetersiz. Detayları gözden geçirip tekrar gönderebilirsin.'}</div>
          </td>
        </tr>
      </table>`,
    ctaLabel: 'İlanı Düzenle',
    ctaUrl: dashboardUrl,
    tipBox: {
      title: 'Hatırlatma',
      body: 'En sık görülen sorunlar: az fotoğraf (3 minimum), bulanık görseller, kısa açıklama, yanlış lokasyon işareti.',
    },
  });
}

export function tplKycApproved({ name, dashboardUrl }: { name: string; dashboardUrl: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  return emailShell({
    preheader: 'KYC doğrulaman tamamlandı — premium özellikler açıldı.',
    heroIcon: '🛡️',
    heroEyebrow: 'KYC Tamamlandı',
    title: `Doğrulandın, ${firstName}`,
    intro: 'KYC sürecin başarıyla tamamlandı. Aşağıdaki premium özellikler artık tamamen aktif:',
    bodyHtml: checkList([
      '<strong>Gizli Portföy</strong> — lüks ilanları görüntüle',
      '<strong>Premium tier</strong> ile ilanlarını öne çıkar',
      '<strong>Yatırımcı raporları</strong> — bölgesel talep + getiri verisi',
    ]),
    ctaLabel: 'Premium Özelliklere Geç',
    ctaUrl: dashboardUrl,
  });
}

export function tplKycRejected({ name, dashboardUrl, reason }: { name: string; dashboardUrl: string; reason?: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  return emailShell({
    preheader: 'KYC dosyan tekrar değerlendirmeye alındı.',
    heroIcon: '📋',
    heroEyebrow: 'KYC İnceleme',
    title: 'Belgeleri tekrar yüklemen gerekiyor',
    intro: `Merhaba ${firstName}, KYC dosyan şu an için onaylanmadı.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="background:${C.navy700};border-left:4px solid ${C.amber};border-radius:10px;padding:16px 18px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.amber};margin-bottom:6px;">Sebep</div>
            <div style="color:${C.text};font-size:14px;line-height:1.6;">${reason ? escapeHtml(reason) : 'Yüklenen belge okunamadı veya eksikti.'}</div>
          </td>
        </tr>
      </table>`,
    ctaLabel: 'Belgeleri Yeniden Yükle',
    ctaUrl: dashboardUrl,
  });
}

export function tplPaymentReceipt({ name, amount, currency, type, listingTitle, receiptUrl }: { name: string; amount: number; currency: string; type: string; listingTitle?: string; receiptUrl: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  const dateStr = new Date().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
  return emailShell({
    preheader: `Ödeme makbuzu — ${amount} ${currency}`,
    heroIcon: '🧾',
    heroEyebrow: 'Ödeme Alındı',
    title: 'Teşekkürler, ödemen onaylandı',
    intro: `Merhaba ${firstName}, ödemen başarıyla işlendi. İşlem detayları aşağıda.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.navy700};border:1px solid ${C.border};border-radius:10px;">
        <tr><td style="padding:8px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${infoRow('Açıklama', escapeHtml(type))}
            ${listingTitle ? infoRow('İlan', escapeHtml(listingTitle)) : ''}
            ${infoRow('Tarih', dateStr)}
            <tr>
              <td colspan="2" style="padding:12px 0 4px;border-top:1px dashed ${C.border};"></td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:${C.textMuted};font-size:13px;">Toplam Tutar</td>
              <td style="padding:6px 0;color:${C.orange};font-size:22px;font-weight:800;letter-spacing:-0.01em;">${amount} ${escapeHtml(currency)}</td>
            </tr>
          </table>
        </td></tr>
      </table>`,
    ctaLabel: 'Makbuzu Aç',
    ctaUrl: receiptUrl,
    footerNote: 'Resmi e-fatura 7 iş günü içinde aynı e-posta adresine ayrı bir mailde gönderilir.',
  });
}

export function tplAccountSuspended({ name }: { name: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  return emailShell({
    preheader: 'Hesabın geçici olarak askıya alındı.',
    heroIcon: '🚫',
    heroEyebrow: 'Hesap Durumu',
    title: 'Hesabın askıya alındı',
    intro: `Merhaba ${firstName}, hesabında olağan dışı bir hareketlilik tespit edildi ve güvenlik amacıyla hesap geçici olarak askıya alındı.`,
    bodyHtml: `
      <p style="margin:0;color:${C.text};font-size:14px;line-height:1.7;">İtiraz etmek veya bilgi almak için <a href="mailto:destek@istbaku.com" style="color:${C.orangeLight};text-decoration:none;font-weight:600;">destek@istbaku.com</a> üzerinden bize ulaşabilirsin.</p>`,
    tipBox: {
      title: 'Süreç',
      body: 'İncelemeler genellikle 2 iş günü içinde tamamlanır. Hesabın aktifleşince sana ayrı bir mail göndereceğiz.',
    },
  });
}

export function tplAccountReactivated({ name }: { name: string }) {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  return emailShell({
    preheader: 'Hesabın yeniden açıldı.',
    heroIcon: '🎊',
    heroEyebrow: 'Hesap Aktif',
    title: `Tekrar aktifsin, ${firstName}!`,
    intro: 'Hesabın yeniden açıldı. Panelinle kaldığın yerden devam edebilirsin — favoriler, kayıtlı aramalar ve geçmiş verilerin korundu.',
    bodyHtml: '',
    ctaLabel: 'Giriş Yap',
    ctaUrl: `${appUrl}/auth/sign-in`,
  });
}

export function tplAbuseResolved({ name, reportId, status, reason }: {
  name: string;
  reportId: string;
  status: 'resolved' | 'dismissed';
  reason?: string;
}): string {
  const firstName = escapeHtml(name.split(' ')[0] || 'Yatırımcı');
  const isResolved = status === 'resolved';
  const title = isResolved ? 'Şikayetiniz Değerlendirildi' : 'Şikayet Sonucu';
  return emailShell({
    preheader: isResolved
      ? 'Şikayetin incelendi ve gerekli işlem yapıldı.'
      : 'Şikayetin incelendi — sonuç bilgilendirmesi.',
    heroIcon: '🛡️',
    heroEyebrow: isResolved ? 'İşlem Yapıldı' : 'İnceleme Tamamlandı',
    title,
    intro: `Merhaba ${firstName}, <strong style="color:#e8eef7;">#${escapeHtml(reportId.slice(0, 8))}</strong> numaralı şikayetin ekibimiz tarafından incelendi.`,
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="background:#1e3148;border-left:4px solid ${isResolved ? '#10b981' : '#b8977d'};border-radius:10px;padding:16px 18px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${isResolved ? '#10b981' : '#b8977d'};margin-bottom:6px;">${isResolved ? 'Sonuç: İşlem Yapıldı' : 'Sonuç: Şikayet Reddedildi'}</div>
            <div style="color:#e8eef7;font-size:14px;line-height:1.6;">${
              isResolved
                ? 'Bildirimin değerlendirildi ve ilgili içerik/kullanıcı hakkında gerekli işlem uygulandı. Platformun güvenliğine katkın için teşekkürler.'
                : reason
                  ? escapeHtml(reason)
                  : 'Yapılan inceleme sonucunda bildirilen içeriğin platform kurallarını ihlal etmediği tespit edildi.'
            }</div>
          </td>
        </tr>
      </table>`,
    ctaLabel: 'Ana Sayfaya Dön',
    ctaUrl: appUrl,
    footerNote: 'Şikayetlerle ilgili sorularını <a href="mailto:destek@istbaku.com" style="color:#e3d6c8;text-decoration:none;">destek@istbaku.com</a> üzerinden iletebilirsin.',
  });
}

export const APP_URL = appUrl;
