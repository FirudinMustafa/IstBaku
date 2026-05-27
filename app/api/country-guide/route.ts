import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { countryGuides } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAllowedRedirectUrl } from '@/lib/security';

type GuideLang = 'tr' | 'az' | 'en';
type GuideIso = 'TR' | 'AZ';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const iso = ((searchParams.get('iso') ?? 'TR').toUpperCase()) as GuideIso;
  const langRaw = (searchParams.get('lang') ?? 'tr').toLowerCase();
  const lang: GuideLang = langRaw === 'az' ? 'az' : langRaw === 'en' ? 'en' : 'tr';

  try {
    const [g] = await db.select().from(countryGuides).where(eq(countryGuides.iso, iso)).limit(1);
    if (g?.pdfUrl && !g.pdfUrl.includes('/api/country-guide')) {
      if (isAllowedRedirectUrl(g.pdfUrl)) {
        return NextResponse.redirect(g.pdfUrl, 302);
      }
      console.warn('[country-guide] rejected unsafe pdfUrl', { iso, pdfUrl: g.pdfUrl });
      return new NextResponse('Invalid guide URL', { status: 400 });
    }
  } catch {
    // fall through to inline generation
  }

  const content = GUIDE_CONTENT[lang][iso];
  const pdf = buildGuidePdf(content);
  return new NextResponse(new Blob([pdf as BlobPart], { type: 'application/pdf' }), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="istbaku-guide-${lang}-${iso}.pdf"`,
      'cache-control': 'public, max-age=3600',
    },
  });
}

// --------------------------------------------------------------------------
// Content per (lang, iso).
// --------------------------------------------------------------------------

interface GuideContent {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
  disclaimer: string;
}

const GUIDE_CONTENT: Record<GuideLang, Record<GuideIso, GuideContent>> = {
  tr: {
    TR: {
      title: 'Türkiye\'de Ev Alım Rehberi',
      subtitle: 'Türk vatandaşları için adım adım tapu süreci · ISTBAKU 2026',
      sections: [
        {
          heading: '1. Genel Bakış',
          body: 'Türkiye\'de gayrimenkul alımı, alıcı ile satıcının Tapu Müdürlüğü\'nde imzaladığı resmî devir işlemiyle tamamlanır. Türk vatandaşları için ek izin ya da askerî bölge kontrolü gerekmez; tek kritik adım vergi numarası ile birlikte tapu randevusunu doğru hazırlamaktır. İşlem genelde aynı gün biter.',
        },
        {
          heading: '2. Hazırlık Aşaması',
          body: 'TC kimlik numarası aynı zamanda vergi numarası olarak kullanılır; ayrıca başvuruya gerek yoktur. Banka hesabınızın aktif olduğundan, DASK (Zorunlu Deprem Sigortası) poliçesinin hazır olduğundan ve son 3 ay içinde SPK lisanslı bir eksper tarafından düzenlenmiş ekspertiz raporunun bulunduğundan emin olun. Krediyle alımda banka, ekspertizi kendi anlaşmalı firmasıyla yenileyebilir.',
        },
        {
          heading: '3. Tapu Süreci',
          body: 'WebTapu (webtapu.tkgm.gov.tr) üzerinden başvuruyu açın, alıcı ve satıcı tarafları ekleyin. Sistem harç tutarını hesaplar, ödeme yapıldıktan sonra randevu saatinde tapu memuru huzurunda imzalar atılır. Süreç ortalama 30-45 dakika sürer ve tapu aynı gün teslim edilir. Yabancı dilde tercüman yalnız yabancı uyrukluların aldığı tapularda gerekir.',
        },
        {
          heading: '4. Maliyet Kalemleri',
          body: 'Tapu harcı satış bedelinin %4\'üdür ve geleneksel olarak alıcı/satıcı arasında pazarlık edilir. Döner sermaye ücreti 2026 itibarıyla ~2.500 TL\'dir. DASK poliçesi bina büyüklüğüne göre 1.500-4.500 TL bandındadır. Ayrıca aboneliklerin (su, elektrik, doğalgaz) devir bedellerini de unutmayın.',
        },
        {
          heading: '5. İşlem Sonrası',
          body: 'Tapu alındıktan sonra 30 gün içinde aboneliklerin alıcı adına devri yapılmalıdır. Site ya da apartman aidatları, yönetimle anlaşılarak yeni dönemden başlatılır. Vergi mükellefliği için emlak vergisini takip eden yılın Mayıs ve Kasım aylarında iki taksitte ödemeniz gerekir.',
        },
        {
          heading: '6. ISTBAKU Desteği',
          body: 'ISTBAKU\'nun "Avukatla Eşleş" hizmeti, Türkiye\'de tapu işlemini yöneten anlaşmalı hukuk büroları aracılığıyla sözleşmenizin gözden geçirilmesini sağlar. Anlaşmalı eksperlerle %15\'e varan indirim uygulanır. Detay: istbaku.com/legal-guide adresinden başvurunuzu açabilirsiniz.',
        },
      ],
      disclaimer: 'Bu rehber bilgilendirme amaçlıdır, hukuki tavsiye niteliği taşımaz. Güncel mevzuat için Tapu ve Kadastro Genel Müdürlüğü\'nü (tkgm.gov.tr) takip edin. © 2026 ISTBAKU',
    },
    AZ: {
      title: 'Azerbaycan\'da Ev Alım Rehberi',
      subtitle: 'Türk vatandaşları için Bakü ve diğer şehirlerde alım süreci · ISTBAKU 2026',
      sections: [
        {
          heading: '1. Genel Bakış',
          body: 'Azerbaycan\'da emlak alımı zorunlu olarak noter tarafından düzenlenen alım-satım sözleşmesiyle başlar; ardından ASAN Xidmət\'te tapu tescili yapılır. Türk vatandaşları, yabancı uyruklu alıcılar için tanımlanan özel rejimden yararlanır ve süreci görece kolay tamamlar.',
        },
        {
          heading: '2. Hazırlık Aşaması',
          body: 'İlk adım VOEN (vergi kimlik numarası) almaktır. Bakü\'de en yakın vergi dairesine pasaportla başvurursanız 30 dakika içinde alabilirsiniz. Ardından yabancılara hesap açan Kapital Bank, ABB veya PASHA Bank gibi bir bankada hesap açın; ödeme nakit değil banka transferiyle yapılmalıdır.',
        },
        {
          heading: '3. Noter ve Tapu Süreci',
          body: 'Anlaştığınız mülk için noterde alım-satım sözleşmesi düzenlenir. Sözleşmede satış bedeli, ödeme planı ve teslim koşulları net yazılmalıdır. Sözleşmenin noter onaylı kopyasıyla ASAN Xidmət\'e gidilir; tapu tescili e-imza desteğiyle aynı gün tamamlanır.',
        },
        {
          heading: '4. Maliyet Kalemleri',
          body: 'Devlet rüsumu (tapu harcı) satış bedelinin %0,1\'idir. ASAN Xidmət hizmet bedeli 30 AZN civarındadır. Noter ücreti sözleşme tutarına göre değişir, genelde 100-300 AZN bandında kalır. Bankalar arası transfer ücretini ve döviz çevrim komisyonunu da hesaba katın.',
        },
        {
          heading: '5. Oturum İzni Fırsatı',
          body: '100.000 USD ve üzeri alımlarda Azerbaycan, 1 yıllık ve yenilenebilir oturum izni başvurusuna kapı açar. Başvuru için tapu, banka transfer dekontu ve adres beyanı yeterlidir. ASAN Xidmət üzerinden başvuru ortalama 20 iş günü içinde sonuçlanır.',
        },
        {
          heading: '6. ISTBAKU Desteği',
          body: 'ISTBAKU\'nun Bakü ofisi, noter ve ASAN Xidmət randevularını sizin adınıza yönetir. Türkçe konuşan avukatlarla "Avukatla Eşleş" hizmeti, MIDA bildirimi ve oturum izni sürecinde rehberlik sağlar. Detay: istbaku.com adresindeki Hukuki Rehber sayfasından başvurunuzu açabilirsiniz.',
        },
      ],
      disclaimer: 'Bu rehber bilgilendirme amaçlıdır, hukuki tavsiye niteliği taşımaz. Güncel mevzuat için Azerbaycan Cumhuriyeti Emlak Komitesi\'ni (e-emlak.gov.az) takip edin. © 2026 ISTBAKU',
    },
  },
  az: {
    TR: {
      title: 'Türkiyədə Ev Alış Bələdçisi',
      subtitle: 'Azərbaycan vətəndaşları üçün addım-addım tapu prosesi · ISTBAKU 2026',
      sections: [
        {
          heading: '1. Ümumi Baxış',
          body: 'Türkiyədə daşınmaz əmlakın alışı Tapu Müdürlüyündə imzalanan rəsmi köçürmə əməliyyatı ilə yekunlaşır. Azərbaycan vətəndaşları üçün xüsusi məhdudiyyət yoxdur, lakin xarici alıcı statusunda olduğunuz üçün vergi nömrəsi və ekspertiza hesabatı tələb olunur.',
        },
        {
          heading: '2. Hazırlıq Mərhələsi',
          body: 'Pasportunuzla yaxın vergi idarəsinə müraciət edib Türkiyə vergi nömrəsi (Vergi Kimlik Numarası) alın. Sonra Türkiyə bankında hesab açın və məcburi zəlzələ sığortası (DASK) polisini hazırlayın. SPK lisenziyalı ekspert tərəfindən düzəldilmiş, son 3 ay etibarlı qiymətləndirmə hesabatı tələb olunur.',
        },
        {
          heading: '3. Tapu Müdürlüyü Prosesi',
          body: 'WebTapu sistemində (webtapu.tkgm.gov.tr) müraciəti açın. Xarici vətəndaş kimi imzalanma zamanı andlı tərcüməçi iştirakı məcburidir. Tərcüməçi ilə birlikdə alıcı və satıcı tapu memurunun qarşısında imzalayır. Tapu sənədi adətən elə həmin gün təhvil verilir.',
        },
        {
          heading: '4. Xərc Kalemləri',
          body: 'Tapu rüsumu satış qiymətinin 4%-dir, alıcı və satıcı arasında bölünə bilər. Döner sermaye ödənişi 2026-da təxminən 2.500 TL-dir. DASK polisi bina ölçüsünə görə 1.500-4.500 TL aralığındadır. Tərcüməçi və ekspertiza ayrı haqqdır.',
        },
        {
          heading: '5. 400.000 USD+ Alışda Vətəndaşlıq Yolu',
          body: '400.000 USD və üzərində alış edib 3 il satmamaq öhdəliyini yerinə yetirsəniz, Türk vətəndaşlığı (CBI proqramı) üçün müraciət hüququ qazanırsınız. Vətəndaşlıq prosesi ortalama 4-6 ay çəkir və bütün ailə üzvlərini əhatə edir.',
        },
        {
          heading: '6. ISTBAKU Dəstəyi',
          body: 'ISTBAKU Bakü və İstanbul ofisləri vasitəsilə tapu randevusu, andlı tərcüməçi və ekspertiza üçün anlaşmalı tərəfdaşlar təklif edir. "Avukatla Eşleş" xidməti vətəndaşlıq prosesini sizinlə birlikdə aparır. Detal: istbaku.com/legal-guide.',
        },
      ],
      disclaimer: 'Bu bələdçi yalnız məlumat xarakteri daşıyır, hüquqi məsləhət deyil. Aktual qaydalar üçün tkgm.gov.tr saytını izləyin. © 2026 ISTBAKU',
    },
    AZ: {
      title: 'Azərbaycanda Ev Alış Bələdçisi',
      subtitle: 'Azərbaycan vətəndaşları üçün Bakıda və regionlarda alış · ISTBAKU 2026',
      sections: [
        {
          heading: '1. Ümumi Baxış',
          body: 'Azərbaycanda daşınmaz əmlakın alış-satışı noter müqaviləsi əsasında bağlanır və ASAN Xidmət vasitəsilə Dövlət Reyestrində qeydiyyata alınır. Vətəndaşlar üçün proses sadədir, sənədlərin tamlığı və ödəmənin bank köçürməsi ilə yerinə yetirilməsi əsas məsələdir.',
        },
        {
          heading: '2. Hazırlıq Mərhələsi',
          body: 'Şəxsiyyət vəsiqəniz VOEN əvəzini tutur, əlavə vergi nömrəsi tələb olunmur. Bank hesabınızın aktiv olduğundan və satıcı ilə razılaşılmış ödəmə planının (avans + qalıq) bank tərəfindən təsdiqləndiyindən əmin olun.',
        },
        {
          heading: '3. Noter və Tapu Prosesi',
          body: 'Razılaşdırılan mülk üçün noterdə alış-satış müqaviləsi imzalanır. Müqavilədə ödəmə qrafiki, təhvil tarixi və müştərək mülkiyyət payları dəqiq göstərilməlidir. Notarial təsdiqdən sonra ASAN Xidmət-ə gedilərək tapu reyestri yenilənir.',
        },
        {
          heading: '4. Xərc Kalemləri',
          body: 'Dövlət rüsumu satış məbləğinin 0,1%-dir. ASAN Xidmət xidmət haqqı 30 AZN civarındadır. Noter haqqı müqavilə dəyərinə görə dəyişir (təxminən 100-300 AZN). Bankalar arası köçürmə komissiyonu və əgər varsa, ipoteka rəsmiləşdirmə haqqı əlavə xərc kimi yadda saxlanmalıdır.',
        },
        {
          heading: '5. İşlemdən Sonra',
          body: 'Tapu çıxan kimi kommunal abunəliklər (su, elektrik, qaz, internet) yeni sahibin adına köçürülür. Mənzil sahibləri üçün illik əmlak vergisi tələbi varsa, yerli icra hakimiyyəti tərəfindən bildiriş göndərilir. İcma və mənzil təsərrüfatı haqlarını da yadınızda saxlayın.',
        },
        {
          heading: '6. ISTBAKU Dəstəyi',
          body: 'ISTBAKU "Avukatla Eşleş" xidməti vasitəsilə noter randevusu, müqavilə yoxlanışı və mortgage müraciətləri üçün anlaşmalı tərəfdaşları ilə sizə dəstək olur. Detal: istbaku.com saytında Hüquqi Bələdçi səhifəsi.',
        },
      ],
      disclaimer: 'Bu bələdçi yalnız məlumat xarakteri daşıyır, hüquqi məsləhət deyil. Aktual qaydalar üçün e-emlak.gov.az saytını izləyin. © 2026 ISTBAKU',
    },
  },
  en: {
    TR: {
      title: 'Foreign Buyer Guide — Turkey',
      subtitle: 'Step-by-step property purchase for non-citizens · ISTBAKU 2026',
      sections: [
        {
          heading: '1. Overview',
          body: 'Foreign buyers can purchase residential and commercial property across most of Turkey. The transaction is finalised at a Land Registry (Tapu Müdürlüğü) office and is usually completed in a single day, once the prerequisites are in place. A sworn translator must attend the signing.',
        },
        {
          heading: '2. Preparation',
          body: 'Open a Turkish tax ID (Vergi Kimlik Numarası) at any tax office with your passport and a local address declaration. Open a Turkish bank account so the purchase price can be wired through the banking system — cash payments are not accepted for foreigners. Purchase the mandatory earthquake insurance (DASK) before the appointment.',
        },
        {
          heading: '3. Restricted-Zone Check',
          body: 'The Land Registry verifies that the property is not located in a military or security zone closed to foreigners. Most large cities and tourist regions are fully open. You may also be asked for a copy of the property\'s zoning plan if it is in a sensitive area.',
        },
        {
          heading: '4. Valuation Report',
          body: 'A SPK-licensed appraiser must issue a valuation report (ekspertiz raporu) valid for three months. The report fixes the official transaction value used by the tax authority. Banks usually order their own report when you finance the purchase.',
        },
        {
          heading: '5. Costs',
          body: 'Title deed transfer fee is 4% of the official sale value, traditionally split between buyer and seller. Stamp & cadastre service fee is roughly 2,500 TRY. DASK runs 1,500-4,500 TRY depending on size. Sworn translator and appraiser fees are paid separately.',
        },
        {
          heading: '6. Citizenship Route',
          body: 'A purchase of 400,000 USD or more, combined with a notarised commitment not to resell for 3 years, qualifies the buyer and immediate family for Turkish citizenship under the CBI programme. Processing takes roughly 4-6 months.',
        },
        {
          heading: '7. ISTBAKU Support',
          body: 'Use the "Match with a lawyer" service on istbaku.com/legal-guide for end-to-end assistance: sworn translator booking, appraisal, contract review and the CBI application.',
        },
      ],
      disclaimer: 'This guide is informational and not legal advice. Refer to tkgm.gov.tr for current rules. © 2026 ISTBAKU',
    },
    AZ: {
      title: 'Foreign Buyer Guide — Azerbaijan',
      subtitle: 'Step-by-step property purchase for non-citizens · ISTBAKU 2026',
      sections: [
        {
          heading: '1. Overview',
          body: 'Foreign nationals can purchase residential property in most of Azerbaijan. A notarised purchase contract is mandatory, and title registration is processed via the ASAN Xidmət one-stop service centre. Payments must clear through the banking system.',
        },
        {
          heading: '2. Preparation',
          body: 'Apply for a VOEN (taxpayer identification number) at the local tax office with your passport. Open an account at a bank that serves foreigners (Kapital Bank, ABB, PASHA). Translate your passport into Azerbaijani and have it notarised.',
        },
        {
          heading: '3. Notarial Contract',
          body: 'Together with the seller, sign the purchase-sale contract before a notary. The contract must state the price, payment schedule, handover date and any joint-ownership shares. Both sides must sign in person; an interpreter joins if you are not fluent in Azerbaijani.',
        },
        {
          heading: '4. Title Registration',
          body: 'Submit the notarised contract at ASAN Xidmət. Registration is typically completed the same day with the help of e-signatures. The new title document (çıxarış) is issued in your name.',
        },
        {
          heading: '5. Costs',
          body: 'State fee for title registration is 0.1% of the sale value. ASAN service charge is around 30 AZN. Notary fees range from 100-300 AZN. Add bank transfer commissions and FX conversion costs to the total budget.',
        },
        {
          heading: '6. Residency Permit',
          body: 'A purchase of 100,000 USD or more qualifies the buyer for a 1-year, renewable residency permit. Apply with the title document, bank transfer receipt and address declaration. Average processing time is 20 business days.',
        },
        {
          heading: '7. ISTBAKU Support',
          body: 'ISTBAKU\'s Baku office books notary slots, ASAN appointments and provides a bilingual lawyer through the "Match with a lawyer" service. Visit istbaku.com for details.',
        },
      ],
      disclaimer: 'This guide is informational and not legal advice. Refer to e-emlak.gov.az for current rules. © 2026 ISTBAKU',
    },
  },
};

// --------------------------------------------------------------------------
// PDF builder with Turkish character support.
//
// Strategy: standard Helvetica + WinAnsiEncoding, plus a /Differences array
// that maps Turkish-specific glyphs (gbreve, Gbreve, scedilla, Scedilla,
// dotlessi, Idotaccent) into bytes 0x80..0x85 — slots that WinAnsiEncoding
// leaves undefined or punctuates. The text is encoded into those bytes
// before being written as a PDF hex string.
//
// Azerbaijani schwa (ə/Ə) is not part of the Adobe Standard 14 glyph set,
// so it falls back to e/E for visual fidelity.
// --------------------------------------------------------------------------

const TR_DIFF: Record<string, number> = {
  'ğ': 0x80, 'Ğ': 0x81, 'ş': 0x82, 'Ş': 0x83, 'ı': 0x84, 'İ': 0x85,
};

function encodeForPdf(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const mapped = TR_DIFF[ch];
    if (mapped !== undefined) { out.push(mapped); continue; }
    if (ch === 'ə') { out.push(0x65); continue; }
    if (ch === 'Ə') { out.push(0x45); continue; }
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xFF) out.push(cp);
    else out.push(0x3F);
  }
  return out;
}

function toPdfHex(s: string): string {
  const bytes = encodeForPdf(s);
  let h = '';
  for (const b of bytes) h += b.toString(16).padStart(2, '0').toUpperCase();
  return `<${h}>`;
}

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if (cur.length + 1 + w.length > maxChars) { out.push(cur); cur = w; }
    else cur += ' ' + w;
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function buildGuidePdf(content: GuideContent): Uint8Array {
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 56;
  const WRAP_CHARS = 82;

  const pages: string[] = [];
  let stream = 'BT\n';
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    stream += 'ET\n';
    pages.push(stream);
    stream = 'BT\n';
    y = PAGE_H - MARGIN;
  };

  const ensure = (need: number) => {
    if (y - need < MARGIN + 24) newPage();
  };

  stream += `/F2 22 Tf 1 0 0 1 ${MARGIN} ${y} Tm ${toPdfHex(content.title)} Tj\n`;
  y -= 30;
  stream += `/F1 11 Tf 1 0 0 1 ${MARGIN} ${y} Tm ${toPdfHex(content.subtitle)} Tj\n`;
  y -= 28;

  for (const sec of content.sections) {
    ensure(40);
    stream += `/F2 13 Tf 1 0 0 1 ${MARGIN} ${y} Tm ${toPdfHex(sec.heading)} Tj\n`;
    y -= 18;

    for (const para of sec.body.split('\n')) {
      const lines = wrapLine(para, WRAP_CHARS);
      for (const line of lines) {
        ensure(16);
        stream += `/F1 10 Tf 1 0 0 1 ${MARGIN} ${y} Tm ${toPdfHex(line)} Tj\n`;
        y -= 13;
      }
      y -= 4;
    }
    y -= 8;
  }

  ensure(20);
  stream += `/F1 8 Tf 1 0 0 1 ${MARGIN} ${MARGIN - 18} Tm ${toPdfHex(content.disclaimer)} Tj\n`;
  stream += 'ET';
  pages.push(stream);

  // Now build the PDF body. Object layout:
  //   1: Catalog
  //   2: Pages
  //   3..(3+N-1): Page objects
  //   (3+N)..(3+2N-1): Page content streams
  //   next: Font /F1 (Helvetica), Font /F2 (Helvetica-Bold), Encoding
  const N = pages.length;
  const pageObjStart = 3;
  const contentObjStart = pageObjStart + N;
  const fontF1 = contentObjStart + N;
  const fontF2 = fontF1 + 1;
  const encObj = fontF2 + 1;

  const objects: string[] = [];
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  const kids = Array.from({ length: N }, (_, i) => `${pageObjStart + i} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${N} >>`);

  for (let i = 0; i < N; i++) {
    const contentObj = contentObjStart + i;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R >> >> ` +
        `/Contents ${contentObj} 0 R >>`,
    );
  }
  for (let i = 0; i < N; i++) {
    const body = pages[i];
    objects.push(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
  }
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding ${encObj} 0 R >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding ${encObj} 0 R >>`);
  objects.push(
    `<< /Type /Encoding /BaseEncoding /WinAnsiEncoding ` +
      `/Differences [128 /gbreve /Gbreve /scedilla /Scedilla /dotlessi /Idotaccent] >>`,
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xFF;
  return bytes;
}
