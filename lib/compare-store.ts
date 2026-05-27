'use client';

// Karşılaştırma için seçilen ilan ID'lerinin pub-sub store'u.
// localStorage'da saklanır, multi-tab senkronize, max 3 öğe.

import * as React from 'react';

const KEY = 'istbaku-compare';
export const MAX_COMPARE = 3;
const CHANGE_EVENT = 'istbaku-compare-changed';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_COMPARE)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

export const compareStore = {
  list(): string[] { return read(); },
  has(id: string): boolean { return read().includes(id); },
  count(): number { return read().length; },
  add(id: string): { ok: boolean; reason?: string } {
    const cur = read();
    if (cur.includes(id)) return { ok: false, reason: 'already' };
    if (cur.length >= MAX_COMPARE) return { ok: false, reason: 'full' };
    write([...cur, id]);
    return { ok: true };
  },
  remove(id: string) {
    write(read().filter((x) => x !== id));
  },
  toggle(id: string): { added: boolean; reason?: string } {
    if (this.has(id)) {
      this.remove(id);
      return { added: false };
    }
    const r = this.add(id);
    return { added: r.ok, reason: r.reason };
  },
  clear() {
    write([]);
  },
};

export function useCompare() {
  const [ids, setIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    const read = () => setIds(compareStore.list());
    read();
    window.addEventListener(CHANGE_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(CHANGE_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);
  return {
    ids,
    count: ids.length,
    full: ids.length >= MAX_COMPARE,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => compareStore.toggle(id),
    add: (id: string) => compareStore.add(id),
    remove: (id: string) => compareStore.remove(id),
    clear: () => compareStore.clear(),
  };
}
