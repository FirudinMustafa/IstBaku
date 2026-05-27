'use server';

import { getAllListings } from './db-queries';
import { sleep } from './utils';
import type { Property, UserGoal } from './types';

const LATENCY = Number(process.env.MOCK_AI_LATENCY_MS ?? 600);

export interface AIMatchResult {
  property: Property;
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

export interface AIMatchInput {
  goals: UserGoal[];
  countries?: string[];
  propertyTypes?: string[];
  maxBudgetUSD?: number;
  horizonYears?: number;
  maxResults?: number;
}

export async function aiMatchAction(input: AIMatchInput): Promise<AIMatchResult[]> {
  await sleep(LATENCY);
  const properties = await getAllListings(false);

  const countries = input.countries ?? ['TR', 'AZ'];
  const horizon = input.horizonYears ?? 5;
  const maxResults = input.maxResults ?? 5;
  const maxBudget = input.maxBudgetUSD;

  const propertyTypes = input.propertyTypes;

  const scored = properties
    .filter((p) => countries.includes(p.country))
    .filter((p) => !propertyTypes || propertyTypes.length === 0 || propertyTypes.includes(p.type))
    .map((p) => {
      const breakdowns = input.goals.map((g) => GOAL_WEIGHTS[g](p));
      let total = Math.round(breakdowns.reduce((acc, b) => acc + b.score, 0) / Math.max(input.goals.length, 1));
      const pros = Array.from(new Set(breakdowns.flatMap((b) => b.pros))).slice(0, 4);
      const cons = Array.from(new Set(breakdowns.flatMap((b) => b.cons))).slice(0, 2);

      if (maxBudget && p.price > maxBudget) {
        total -= 25;
        cons.unshift(`Bütçenin üzerinde (${p.price.toLocaleString('en-US')} ${p.currency})`);
      }
      if (horizon <= 2 && (p.type === 'arsa' || p.type === 'proje')) {
        total -= 8;
        cons.push('Kısa ufka uygun değil (likidite düşük)');
      }
      if (horizon >= 7 && p.type === 'arsa') { total += 6; pros.push('Uzun ufukta arsa primi'); }
      if (horizon >= 7 && p.type === 'proje') { total += 4; pros.push('Uzun ufukta proje değer artışı'); }

      total = Math.max(0, Math.min(100, total));

      return {
        property: p,
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
