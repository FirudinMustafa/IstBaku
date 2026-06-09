/**
 * Onaylı ilan fotolarına soluk logo izi (Tur6). CSS overlay — sayfada ve ekran
 * görüntüsünde görünür, görsel dosyasını değiştirmez. `pointer-events-none`.
 * Konteyner `relative` olmalı.
 */
export function Watermark({ variant = 'card' }: { variant?: 'card' | 'hero' }) {
  const size = variant === 'hero' ? 'w-40 sm:w-56' : 'w-24 sm:w-28';
  return (
    <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/word-tan.png"
        alt=""
        className={`${size} max-w-[55%] select-none opacity-[0.22] drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] -rotate-12`}
      />
    </div>
  );
}
