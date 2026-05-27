import type { Property, UserGoal } from './types';
import { PROPERTIES } from './data/properties';
import { sleep } from './utils';

const LATENCY = Number(process.env.MOCK_AI_LATENCY_MS ?? 900);

export interface AIMatchResult {
  propertyId: string;
  fitScore: number;
  reasoning: string;
  pros: string[];
  cons: string[];
}

const GOAL_WEIGHTS: Record<UserGoal, (p: Property) => { score: number; pros: string[]; cons: string[] }> = {
  oturum: (p) => {
    const pros: string[] = [];
    const cons: string[] = [];
    let s = 40;
    if (p.elevator) { s += 8; pros.push('Asansörlü'); }
    if (p.parking !== 'yok') { s += 8; pros.push('Otoparklı'); }
    if (p.heating !== 'yok') { s += 6; pros.push('Konforlu ısıtma'); }
    if (p.inSite) { s += 8; pros.push('Site içi yaşam'); }
    if (p.purpose === 'rent') { s -= 10; cons.push('Kiralık (oturum için satın al hedefliyse uygun değil)'); }
    if (p.buildingAge > 25) { s -= 10; cons.push(`Bina ${p.buildingAge} yaşında`); }
    if (p.type === 'arsa') { s -= 30; cons.push('Arsa - oturum için uygun değil'); }
    if (p.type === 'is_yeri') { s -= 30; cons.push('İş yeri - oturum için uygun değil'); }
    return { score: s, pros, cons };
  },
  kira: (p) => {
    const pros: string[] = [];
    const cons: string[] = [];
    let s = 30 + p.score.rentYield * 0.6;
    if (p.status === 'kiracili') { s += 12; pros.push('Hazır kiracılı (anında gelir)'); }
    if (p.furnished) { s += 6; pros.push('Eşyalı (kısa dönem avantajı)'); }
    if (p.type === 'arsa') { s -= 40; cons.push('Arsa - kira getirisi yok'); }
    if (p.tier === 'premium' && p.price > 800000) { s -= 8; cons.push('Yüksek fiyat → yield düşer'); }
    return { score: s, pros, cons };
  },
  yazlik: (p) => {
    const pros: string[] = [];
    const cons: string[] = [];
    let s = 20;
    if (['Muğla', 'Antalya', 'İzmir'].includes(p.city)) { s += 25; pros.push(`${p.city} sahil bölgesi`); }
    if (p.district === 'Bayıl' || p.city === 'Bakı') { s += 10; pros.push('Hazar kıyısına yakın'); }
    if (p.pool) { s += 8; pros.push('Havuzlu'); }
    if (p.type === 'villa') { s += 10; pros.push('Müstakil villa'); }
    if (p.type === 'is_yeri') { s -= 30; cons.push('İş yeri - yazlık için uygun değil'); }
    return { score: s, pros, cons };
  },
  yatirim: (p) => {
    const pros: string[] = [];
    const cons: string[] = [];
    let s = p.score.total * 0.85;
    if (p.istbakuApproved) { s += 6; pros.push('ISTBAKU Onaylı (güven)'); }
    if (p.type === 'proje') { s += 8; pros.push('Off-plan → erken giriş primi'); }
    if (p.type === 'arsa') { s += 4; pros.push('Uzun vadeli değer artışı'); }
    if (p.buildingAge > 20 && p.type !== 'arsa') { s -= 6; cons.push('Bina yaşı yüksek'); }
    return { score: s, pros, cons };
  },
};

export interface AIMatchOptions {
  goals: UserGoal[];
  countries?: string[];
  /** Maks. bütçe (USD'ye normalize edilmiş varsayım) */
  maxBudgetUSD?: number;
  /** Yatırım ufku (yıl) — uzun ufukta proje/arsa öne çıkar */
  horizonYears?: number;
  maxResults?: number;
}

export async function aiMatch(
  goalsOrOptions: UserGoal[] | AIMatchOptions,
  countriesArg: string[] = ['TR', 'AZ'],
  maxResultsArg = 5,
): Promise<AIMatchResult[]> {
  await sleep(LATENCY);

  const opts: AIMatchOptions = Array.isArray(goalsOrOptions)
    ? { goals: goalsOrOptions, countries: countriesArg, maxResults: maxResultsArg }
    : goalsOrOptions;

  const goals = opts.goals;
  const countries = opts.countries ?? ['TR', 'AZ'];
  const maxResults = opts.maxResults ?? 5;
  const maxBudget = opts.maxBudgetUSD;
  const horizon = opts.horizonYears ?? 5;

  const scored = PROPERTIES
    .filter((p) => countries.includes(p.country))
    .map((p) => {
      const breakdowns = goals.map((g) => GOAL_WEIGHTS[g](p));
      let total = Math.round(breakdowns.reduce((acc, b) => acc + b.score, 0) / Math.max(goals.length, 1));
      const pros = Array.from(new Set(breakdowns.flatMap((b) => b.pros))).slice(0, 4);
      const cons = Array.from(new Set(breakdowns.flatMap((b) => b.cons))).slice(0, 2);

      // Bütçe kontrolü — USD varsayımı (mock)
      if (maxBudget && p.price > maxBudget) {
        total -= 25;
        cons.unshift(`Bütçenin üzerinde (${p.price.toLocaleString('en-US')} ${p.currency})`);
      }

      // Ufuk: kısa ufuk → likit (konut/luks_konut); uzun → arsa/proje primlenir
      if (horizon <= 2 && (p.type === 'arsa' || p.type === 'proje')) {
        total -= 8;
        cons.push('Kısa ufka uygun değil (likidite düşük)');
      }
      if (horizon >= 7 && p.type === 'arsa') {
        total += 6;
        pros.push('Uzun ufukta arsa primi');
      }
      if (horizon >= 7 && p.type === 'proje') {
        total += 4;
        pros.push('Uzun ufukta proje değer artışı');
      }

      total = Math.max(0, Math.min(100, total));

      return {
        propertyId: p.id,
        fitScore: total,
        pros,
        cons,
        reasoning: `${p.city}/${p.district} bölgesinde, hedeflerinle uyum ${total}/100. ${p.score.reasoning}`,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, maxResults);

  return scored;
}

export async function aiDescribe(rawText: string): Promise<{ title: string; description: string; tags: string[] }> {
  await sleep(LATENCY);
  const cleaned = rawText.trim().replace(/\s+/g, ' ');
  const sentences = cleaned.split(/[.!?]+/).filter(Boolean);
  const title = (sentences[0] || 'İlan')
    .replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'))
    .slice(0, 80);
  const description =
    sentences.map((s) => s.trim().replace(/^./, (c) => c.toLocaleUpperCase('tr-TR')) + '.').join(' ') +
    ' İlan, ISTBAKU AI tarafından gözden geçirilmiştir.';
  const tagPool = ['boğaz', 'manzara', 'yeni', 'havuzlu', 'merkezi', 'asansörlü', 'eşyalı', 'kiraya hazır', 'kredi uygun'];
  const tags = tagPool.filter((t) => cleaned.toLowerCase().includes(t)).slice(0, 4);
  return { title, description, tags };
}

export async function aiExplainScore(p: Property): Promise<string[]> {
  await sleep(LATENCY / 2);
  return [
    `Bölge talep endeksi: ${Math.min(100, p.score.region)}/100 — ${p.city}/${p.district} bölgesinde aktif arama yoğunluğu.`,
    `Fiyat metriği: ${p.score.price}/100 — bölge ortalamasıyla kıyaslandığında konum/m² rasyonel.`,
    `Kira getirisi: ${p.score.rentYield}/100 — beklenen yıllık brüt yield.`,
    `Talep skoru: ${p.score.demand}/100 — yabancı yatırımcı ilgisi dahil.`,
    `Sonuç: ${p.score.reasoning}`,
  ];
}
