import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[color:var(--bg-card-hover)] rounded-md overflow-hidden relative', className)}>
    <div className="absolute inset-0 shimmer" />
  </div>;
}
