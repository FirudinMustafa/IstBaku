'use client';

import * as React from 'react';

// İlan detay sayfası açıldığında görüntülenmeyi bir kez sunucuya bildirir.
export function ViewTracker({ id }: { id: string }) {
  React.useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    fetch('/api/listings/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: ctrl.signal,
      keepalive: true,
    }).catch(() => {});
    return () => ctrl.abort();
  }, [id]);
  return null;
}
