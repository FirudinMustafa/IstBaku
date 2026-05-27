'use client';

import * as React from 'react';
import { getMyFavoriteIdsAction, toggleFavoriteAction } from './favorite-actions';

// Client-side favori ID kümesi cache + server senkron

let cachedIds: Set<string> | null = null;
const CHANGE_EVENT = 'istbaku-favorites-changed';

async function loadIds(): Promise<Set<string>> {
  if (cachedIds) return cachedIds;
  try {
    const ids = await getMyFavoriteIdsAction();
    cachedIds = new Set(ids);
  } catch {
    cachedIds = new Set();
  }
  return cachedIds;
}

export function useFavorites() {
  const [ids, setIds] = React.useState<Set<string>>(new Set());
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    loadIds().then((s) => {
      if (cancelled) return;
      setIds(new Set(s));
      setReady(true);
    });
    const onChange = () => {
      if (cachedIds) setIds(new Set(cachedIds));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  async function toggle(id: string): Promise<{ ok: boolean; favorited: boolean }> {
    const r = await toggleFavoriteAction(id);
    if (r.ok && cachedIds) {
      if (r.favorited) cachedIds.add(id); else cachedIds.delete(id);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
    return r;
  }

  return {
    ids,
    ready,
    has: (id: string) => ids.has(id),
    toggle,
  };
}
