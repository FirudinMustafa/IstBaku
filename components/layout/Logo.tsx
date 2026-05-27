import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group">
      <span
        className="relative inline-flex items-center justify-center font-bold text-navy-900"
        style={{ width: dim, height: dim }}
      >
        <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 group-hover:scale-105 transition-transform" />
        <span className="relative text-sm">İB</span>
      </span>
      <span className="font-bold tracking-tight text-[15px] leading-none">ISTBAKU</span>
    </Link>
  );
}
