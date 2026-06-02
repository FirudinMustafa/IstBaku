import Link from 'next/link';
import Image from 'next/image';

export function Logo({ size = 'md', wordmark = true }: { size?: 'sm' | 'md' | 'lg'; wordmark?: boolean }) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="ISTBAKU">
      <span
        className="relative inline-flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ width: dim, height: dim }}
      >
        {/* Navy mark for light backgrounds; tan mark when inside a .dark scope */}
        <Image
          src="/brand/mark-navy.png"
          alt=""
          width={dim}
          height={dim}
          priority
          className="block dark:hidden h-full w-full object-contain"
        />
        <Image
          src="/brand/mark-tan.png"
          alt=""
          width={dim}
          height={dim}
          priority
          className="hidden dark:block absolute inset-0 h-full w-full object-contain"
        />
      </span>
      {wordmark && (
        <span className="font-display font-bold tracking-tight text-[15px] leading-none">ISTBAKU</span>
      )}
    </Link>
  );
}
