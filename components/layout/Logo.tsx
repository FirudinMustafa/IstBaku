import Link from 'next/link';
import Image from 'next/image';

// "istbaku.com" wordmark (381×96, ~3.97:1). Navy on light backgrounds,
// tan when inside a `.dark` scope. Sized by fixed height; width follows ratio.
const RATIO = 381 / 96;

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg'; wordmark?: boolean }) {
  const h = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const w = Math.round(h * RATIO);
  return (
    <Link href="/" className="inline-flex items-center group" aria-label="istbaku.com">
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
