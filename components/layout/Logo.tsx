import Link from 'next/link';
import Image from 'next/image';

// "istbaku.com" wordmark (381×96, ~3.97:1) + kare marka (İB ikonu) solunda.
// Her ikisi navy (açık zemin) / tan (.dark scope) varyantıyla tema değiştirir.
// Yükseklikle ölçeklenir; wordmark genişliği orana göre türetilir.
const RATIO = 381 / 96;

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg'; wordmark?: boolean }) {
  const h = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const w = Math.round(h * RATIO);
  // İkon, wordmark'ın metin yüksekliğinden biraz büyük dursun ki yanında dengeli görünsün.
  const markH = Math.round(h * 1.4);
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 sm:gap-2 group" aria-label="istbaku.com">
      {/* Marka ikonu (İB) — dekoratif, alt metin Link aria-label'inde */}
      <span
        className="relative inline-flex items-center shrink-0 transition-transform group-hover:scale-105"
        style={{ height: markH, width: markH }}
      >
        <Image
          src="/brand/mark-navy.png"
          alt=""
          width={markH}
          height={markH}
          priority
          className="block dark:hidden h-full w-full object-contain"
        />
        <Image
          src="/brand/mark-tan.png"
          alt=""
          width={markH}
          height={markH}
          priority
          className="hidden dark:block absolute inset-0 h-full w-full object-contain"
        />
      </span>

      {/* "istbaku.com" wordmark */}
      <span
        className="relative inline-flex items-center shrink-0 transition-transform group-hover:scale-105"
        style={{ height: h, width: w }}
      >
        <Image
          src="/brand/word-navy.png"
          alt="istbaku.com"
          width={w}
          height={h}
          priority
          className="block dark:hidden h-full w-full object-contain"
        />
        <Image
          src="/brand/word-tan.png"
          alt="istbaku.com"
          width={w}
          height={h}
          priority
          className="hidden dark:block absolute inset-0 h-full w-full object-contain"
        />
      </span>
    </Link>
  );
}
