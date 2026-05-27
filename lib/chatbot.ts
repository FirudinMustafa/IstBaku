// Site-aware mock AI chatbot. Production'da: Claude Sonnet 4.6 + system prompt + tool calling.

import type { Lang } from './types';

export interface ChatActions { label: string; href: string }

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatActions[];
  followups?: string[];
  at: number;
}

/** Reply body per intent / language. */
interface LangReply {
  reply: string;
  actions?: ChatActions[];
  followups?: string[];
}

interface Intent {
  id: string;
  match: (text: string) => boolean;
  /** Reply table keyed by Lang. The matcher always uses 'tr' for keyword
   *  hints (lowercased input is searched), but the reply text is picked by
   *  the active Lang. */
  // Yeni diller (ru/de/zh) için TR fallback otomatik (`?? intent.reply.tr`).
  reply: Partial<Record<Lang, LangReply>> & { tr: LangReply };
}

const has = (s: string, ...kws: string[]) => kws.some((k) => s.includes(k));

// ---- Intent definitions -----------------------------------------------------

const INTENTS: Intent[] = [
  {
    id: 'greet',
    match: (s) => /^(merhaba|selam|salam|hi|hello|hey|hola|salom)\b/.test(s),
    reply: {
      tr: {
        reply:
          'Merhaba 👋 Ben **ISTBAKU AI Asistanı**. emlak platformumuzda sana yol gösterebilirim — ilan ara, AI eşleşme başlat, yatırım hesabı yap ya da hukuki rehberi indir.',
        followups: [
          'AI yatırım skoru nedir?',
          "Bakı'da 200K USD altı ilan göster",
          'Nasıl ilan veririm?',
          'Gizli portföye nasıl girilir?',
        ],
      },
      az: {
        reply:
          'Salam 👋 Mən **ISTBAKU AI Köməkçisiyəm**. Türkiyə və Azərbaycan əmlak platformasında sənə yol göstərə bilərəm — elan axtar, AI uyğunlaşmanı başlat, investisiya hesablamasını apar və ya hüquqi bələdçini yüklə.',
        followups: [
          'AI investisiya skoru nədir?',
          'Bakıda 200K USD altı elan göstər',
          'Necə elan yerləşdirə bilərəm?',
          'Gizli portfelə necə qoşulum?',
        ],
      },
      en: {
        reply:
          "Hello 👋 I'm the **ISTBAKU AI Assistant**. I can guide you through our investment-focused real-estate platform — search listings, start an AI match, run an investment calculator, or download a legal guide.",
        followups: [
          'What is the AI investment score?',
          'Show listings under 200K USD in Baku',
          'How do I post a listing?',
          'How do I access the private portfolio?',
        ],
      },
    },
  },
  {
    id: 'ai_score',
    match: (s) => has(s, 'yatırım skor', 'ai skor', 'skor nas', 'puan nas', 'investisiya', 'investment score', 'ai score'),
    reply: {
      tr: {
        reply:
          '**AI Yatırım Skoru** 0-100 (gösterimde /10) arası 4 metriği harmanlar: **konum puanı**, **fiyat uygunluğu**, **kira getirisi** ve **piyasa talebi**. Her ilan detayında "Skor nasıl hesaplandı?" altında detayını görebilirsin — açıklanabilir AI (XAI).',
        actions: [{ label: 'İlanları gör', href: '/listings' }],
        followups: ['Bana özel ilan öner', 'Konum puanı nasıl hesaplanır?'],
      },
      az: {
        reply:
          '**AI İnvestisiya Skoru** 0-100 arasında 4 metriki birləşdirir: **məkan balı**, **qiymət uyğunluğu**, **icarə gəliri** və **bazar tələbi**. Hər elan səhifəsində "Skor necə hesablandı?" bölməsində izahını görəcəksən — izah olunan AI (XAI).',
        actions: [{ label: 'Elanlara bax', href: '/listings' }],
        followups: ['Mənə uyğun elan təklif et', 'Məkan balı necə hesablanır?'],
      },
      en: {
        reply:
          'The **AI Investment Score** combines 4 metrics on a 0-100 scale: **location**, **price fit**, **rental yield**, and **market demand**. On each listing detail you can open "How is the score computed?" for an explainable-AI (XAI) breakdown.',
        actions: [{ label: 'Browse listings', href: '/listings' }],
        followups: ['Recommend listings for me', 'How is the location score computed?'],
      },
    },
  },
  {
    id: 'foreign_buy',
    match: (s) => has(
      s,
      'yabancı', 'foreigner', 'foreign', 'xarici', 'can foreigners', 'can a foreigner',
      'yabancı alıcı', 'türkiye’de ev', "türkiye'de ev", 'turkey property', 'buy property in turkey',
    ),
    reply: {
      tr: {
        reply:
          '**Yabancı alıcılar Türkiye’de mülk satın alabilir**. Bazı askeri/güvenlik bölgeleri hariç tüm illerde mümkündür. Asgari ihtiyaçlar: pasaport, vergi numarası, DASK ve banka hesabı. $400K+ alımda **Türk vatandaşlık** başvurusu yapılabilir. Hukuki Rehber sihirbazında "Yabancı alıcı" yolunu seç.',
        actions: [
          { label: 'Hukuki Rehber', href: '/legal-guide' },
          { label: 'TR ilanları', href: '/listings?country=TR' },
        ],
        followups: ['$400K vatandaşlık şartları?', 'Yabancı için tapu süreci?'],
      },
      az: {
        reply:
          '**Xaricilər Türkiyədə əmlak ala bilərlər**. Bəzi hərbi bölgələrdən başqa bütün şəhərlərdə mümkündür. Lazım olanlar: pasport, vergi nömrəsi, DASK sığortası və bank hesabı. $400K-dan yuxarı alışda **Türkiyə vətəndaşlığı** üçün müraciət etmək olar. Hüquqi Bələdçidə "Xarici alıcı" yolunu seç.',
        actions: [
          { label: 'Hüquqi Bələdçi', href: '/legal-guide' },
          { label: 'TR elanları', href: '/listings?country=TR' },
        ],
        followups: ['$400K vətəndaşlıq şərtləri?', 'Xarici üçün tapu prosesi?'],
      },
      en: {
        reply:
          '**Foreigners can buy property in Turkey**. It is allowed in almost every province except a few military / restricted zones. Minimum requirements: passport, tax number, DASK earthquake insurance, and a Turkish bank account. Purchases of **$400K+** can be the basis for a Turkish citizenship application. Pick the "Foreign buyer" path in the Legal Guide wizard.',
        actions: [
          { label: 'Legal Guide', href: '/legal-guide' },
          { label: 'Turkey listings', href: '/listings?country=TR' },
        ],
        followups: ['$400K citizenship conditions?', 'Title deed process for foreigners?'],
      },
    },
  },
  {
    id: 'ai_match',
    match: (s) => has(s, 'eşleşme', 'öner', 'tavsiye', 'bana özel', 'match', 'uyğun', 'recommend'),
    reply: {
      tr: {
        reply:
          '**AI Eşleşme** 4 adımda çalışır: (1) hedefini seç (oturum / kira / yazlık / yatırım), (2) ülkeleri seç, (3) bütçe ve yatırım ufkunu gir, (4) AI seçtiğin ülkelerden 5 en uygun ilanı önerir — her birinin neden seçildiği açıklamalı.',
        actions: [{ label: 'AI Eşleşmeyi Başlat', href: '/ai-match' }],
      },
      az: {
        reply:
          '**AI Uyğunlaşma** 4 addımda işləyir: (1) məqsədini seç (yaşamaq / icarə / yay evi / investisiya), (2) ölkəni seç, (3) büdcəni və müddətini daxil et, (4) AI seçdiyin ölkələrdən 5 ən uyğun elanı təqdim edir — hər biri üçün izah ilə.',
        actions: [{ label: 'AI Uyğunlaşmanı başlat', href: '/ai-match' }],
      },
      en: {
        reply:
          'The **AI Match** runs in 4 steps: (1) pick your goal (residency / rental / vacation / investment), (2) pick countries, (3) enter budget and horizon, (4) AI surfaces the 5 best listings across selected countries — each with an explanation.',
        actions: [{ label: 'Start AI Match', href: '/ai-match' }],
      },
    },
  },
  {
    id: 'new_listing',
    match: (s) => has(s, 'ilan ver', 'ilan ekle', 'elan yerleş', 'yeni ilan', 'satıyorum', 'kiralık vermek', 'post a listing', 'upload listing', 'how to list'),
    reply: {
      tr: {
        reply:
          '**İlan Verme**: 8 adımlı sihirbaz — Tür → Konum → Detay → Medya → Kapak (foto/video) → Bölge Profili → AI Düzelt → Seviye (Standart / Güçlü / Premium). Premium ilanlar admin onayından geçer, **ISTBAKU Onaylı** rozeti alır.',
        actions: [{ label: 'İlan ver', href: '/new-listing' }],
      },
      az: {
        reply:
          '**Elan yerləşdirmək**: 8 addımlı sehrbaz — Növ → Yer → Detallar → Media → Üz şəkli (foto / video) → Bölgə profili → AI redaktə → Səviyyə (Standart / Güclü / Premium). Premium elanlar admin təsdiqindən keçir, **ISTBAKU Təsdiqli** nişanı alır.',
        actions: [{ label: 'Elan yerləşdir', href: '/new-listing' }],
      },
      en: {
        reply:
          'To **post a listing** open the 8-step wizard: Type → Location → Details → Media → Cover (photo or video) → Neighbourhood profile → AI proof-read → Tier (Standard / Boosted / Premium). Premium listings are admin-reviewed and earn the **ISTBAKU Verified** badge.',
        actions: [{ label: 'New listing', href: '/new-listing' }],
      },
    },
  },
  {
    id: 'private',
    match: (s) => has(s, 'gizli portföy', 'gizli portfel', 'private', 'lüks', 'premium üyelik', 'davetli', 'private portfolio'),
    reply: {
      tr: {
        reply:
          '**Gizli Portföy**: Pazarın görmediği lüks ilanların olduğu özel koleksiyon. KYC + NDA imzasıyla kilidi açılır. Doğrulanmış yatırımcılar gerçek ilanları görür, diğerlerine bulanık önizleme gösterilir.',
        actions: [{ label: 'Gizli Portföy', href: '/private-portfolio' }],
      },
      az: {
        reply:
          '**Gizli Portfel**: Bazarın görmədiyi lüks elanların xüsusi kolleksiyası. KYC + NDA ilə kilidi açılır. Təsdiqlənmiş investorlar əsl elanları görür, digərlərinə bulanıq önizləmə göstərilir.',
        actions: [{ label: 'Gizli Portfel', href: '/private-portfolio' }],
      },
      en: {
        reply:
          'The **Private Portfolio** is a curated collection of luxury listings invisible to the public marketplace. Unlocked after KYC + NDA — verified investors see real listings; others see a blurred preview.',
        actions: [{ label: 'Private Portfolio', href: '/private-portfolio' }],
      },
    },
  },
  {
    id: 'legal',
    match: (s) => has(s, 'hukuki', 'vatandaş', 'tapu', 'oturum', 'vergi', 'rehber', 'pdf', 'hüquq', 'legal', 'citizen', 'tax'),
    reply: {
      tr: {
        reply:
          '**Hukuki Rehber & PDF**: İnteraktif sihirbaz: vatandaşlık × hedef ülke × amaç → adım adım yol haritası. Ayrıca ana sayfanın altında ülke bayrağına tıklayarak **ev alım rehberi PDF**’ini indirebilirsin.',
        actions: [
          { label: 'Hukuki rehber sihirbazı', href: '/legal-guide' },
          { label: 'PDF rehberleri', href: '/legal-guide#pdf' },
        ],
      },
      az: {
        reply:
          '**Hüquqi Bələdçi & PDF**: İnteraktiv sehrbaz: vətəndaşlıq × hədəf ölkə × məqsəd → addım-addım yol xəritəsi. Ayrıca ana səhifədəki ölkə bayrağına klikləyərək **ev alış bələdçisi PDF**-ni yükləyə bilərsən.',
        actions: [
          { label: 'Hüquqi bələdçi', href: '/legal-guide' },
          { label: 'PDF bələdçilər', href: '/legal-guide#pdf' },
        ],
      },
      en: {
        reply:
          '**Legal guide & PDFs**: an interactive wizard: citizenship × target country × purpose → step-by-step roadmap. You can also download a **home-buying PDF guide** by clicking a country flag at the bottom of the home page.',
        actions: [
          { label: 'Legal wizard', href: '/legal-guide' },
          { label: 'PDF library', href: '/legal-guide#pdf' },
        ],
      },
    },
  },
  {
    id: 'currency',
    match: (s) => has(s, 'kur', 'dolar', 'manat', 'lira', 'euro', 'çevir', 'döviz', 'usd', 'try', 'azn', 'eur', 'valyuta', 'currency'),
    reply: {
      tr: {
        reply:
          '**Para birimi değiştirici** üst menüde sağ tarafta — TRY ₺ / USD $ / EUR € / AZN ₼. Tüm ilanlar otomatik olarak seçilen para birimine çevrilir.',
        actions: [{ label: 'İlanları gez', href: '/listings' }],
      },
      az: {
        reply:
          '**Valyuta dəyişdirici** yuxarı menyunun sağındadır — TRY ₺ / USD $ / EUR € / AZN ₼. Bütün elanlar avtomatik olaraq seçilmiş valyutaya çevrilir.',
        actions: [{ label: 'Elanlara bax', href: '/listings' }],
      },
      en: {
        reply:
          'A **currency switcher** sits at the right of the top header — TRY ₺ / USD $ / EUR € / AZN ₼. Every listing automatically converts to the currency you pick.',
        actions: [{ label: 'Browse listings', href: '/listings' }],
      },
    },
  },
  {
    id: 'thanks',
    match: (s) => has(s, 'teşekkür', 'sağol', 'sağ ol', 'thanks', 'thank you', 'təşəkkür'),
    reply: {
      tr: { reply: 'Rica ederim! Başka sorunda yardım edebilirim. 🙂' },
      az: { reply: 'Buyurun! Başqa sualın olsa, kömək edə bilərəm. 🙂' },
      en: { reply: "You're welcome! Happy to help with anything else. 🙂" },
    },
  },
];

const DEFAULT_REPLY: Partial<Record<Lang, LangReply>> & { tr: LangReply } = {
  tr: {
    reply: 'Sorunu tam çözemedim, ama sana hızlıca şu yönlere göz atmanı önerebilirim:',
    actions: [
      { label: 'İlanları keşfet', href: '/listings' },
      { label: 'AI Eşleşmeyi başlat', href: '/ai-match' },
      { label: 'Hukuki rehber', href: '/legal-guide' },
    ],
    followups: ['AI yatırım skoru nedir?', "Bakı'da 200K USD altı ilan göster", 'Nasıl ilan veririm?'],
  },
  az: {
    reply: 'Sualını tam başa düşmədim, amma bu istiqamətlərə baxmağı tövsiyə edirəm:',
    actions: [
      { label: 'Elanları kəşf et', href: '/listings' },
      { label: 'AI Uyğunlaşmanı başlat', href: '/ai-match' },
      { label: 'Hüquqi bələdçi', href: '/legal-guide' },
    ],
    followups: ['AI investisiya skoru nədir?', 'Bakıda 200K USD altı elan göstər', 'Necə elan yerləşdirim?'],
  },
  en: {
    reply: "I couldn't quite parse that, but you can quickly try one of these:",
    actions: [
      { label: 'Browse listings', href: '/listings' },
      { label: 'Start AI Match', href: '/ai-match' },
      { label: 'Legal guide', href: '/legal-guide' },
    ],
    followups: ['What is the AI investment score?', 'Show listings under 200K USD in Baku', 'How do I post a listing?'],
  },
};

export function respond(userText: string, lang: Lang = 'tr'): Pick<ChatMessage, 'content' | 'actions' | 'followups'> {
  const s = userText.toLocaleLowerCase('tr-TR').trim();
  for (const intent of INTENTS) {
    if (intent.match(s)) {
      const r = intent.reply[lang] ?? intent.reply.tr;
      return { content: r.reply, actions: r.actions, followups: r.followups };
    }
  }
  const r = DEFAULT_REPLY[lang] ?? DEFAULT_REPLY.tr;
  return { content: r.reply, actions: r.actions, followups: r.followups };
}

const WELCOME_BY_LANG: Partial<Record<Lang, Pick<ChatMessage, 'content' | 'followups'>>> & { tr: Pick<ChatMessage, 'content' | 'followups'> } = {
  tr: {
    content:
      '👋 Ben **ISTBAKU AI Asistanı**. emlak platformumuzda yardımcı olurum. Aşağıdaki konulardan birini seçebilir veya doğal dilde sorabilirsin.',
    followups: [
      'AI Yatırım Skoru nedir?',
      "Bakı'da yatırımlık önerir misin?",
      'Gizli portföye nasıl girilir?',
      'Nasıl ilan veririm?',
      "Türk olarak Bakü'de ev alabilir miyim?",
    ],
  },
  az: {
    content:
      '👋 Mən **ISTBAKU AI Köməkçisiyəm**. Türkiyə və Azərbaycan əmlak platformasında sənə yardım edirəm. Aşağıdakı mövzulardan birini seç və ya təbii dildə soruş.',
    followups: [
      'AI İnvestisiya Skoru nədir?',
      'Bakıda investisiya təklif edirsən?',
      'Gizli Portfelə necə qoşulum?',
      'Necə elan yerləşdirim?',
      'Xarici olaraq Türkiyədə ev ala bilərəm?',
    ],
  },
  en: {
    content:
      "👋 I'm the **ISTBAKU AI Assistant**. I help you across our investment-focused real-estate platform. Pick a topic below or just ask in natural language.",
    followups: [
      'What is the AI investment score?',
      'Recommend an investment in Baku',
      'How do I unlock the Private Portfolio?',
      'How do I post a listing?',
      'Can foreigners buy property in Turkey?',
    ],
  },
};

export function buildWelcome(lang: Lang = 'tr'): ChatMessage {
  const w = WELCOME_BY_LANG[lang] ?? WELCOME_BY_LANG.tr;
  return {
    id: 'welcome',
    role: 'assistant',
    at: Date.now(),
    content: w.content,
    followups: w.followups,
  };
}

/** Back-compat: TR welcome message (kept for any caller that still imports it). */
export const WELCOME: ChatMessage = buildWelcome('tr');
