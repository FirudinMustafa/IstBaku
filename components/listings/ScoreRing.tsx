import { cn } from '@/lib/utils';

interface Props {
  /** 0-100 arası ham skor */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  /** Görsel ölçek: 100 ise "85", 10 ise "8.5" gösterir. Default 100. */
  outOf?: 10 | 100;
}

export function ScoreRing({ value, size = 48, stroke = 4, label, outOf = 100 }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const display = outOf === 10 ? (clamped / 10).toFixed(1) : String(clamped);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const color = clamped >= 85 ? 'var(--success)' : clamped >= 70 ? '#CAAE99' : '#b8977d';
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Skor ${display}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-[stroke-dasharray] duration-700"
        />
        <text
          x={cx}
          y={cy}
          dominantBaseline="central"
          textAnchor="middle"
          className={cn(
            'font-bold tabular-nums',
            size < 32 ? 'text-[9px]'
              : size < 48 ? 'text-[12px]'
              : size < 64 ? 'text-[15px]'
              : size < 80 ? 'text-[18px]'
              : 'text-[22px]',
          )}
          fill="currentColor"
          style={{ letterSpacing: '-0.02em' }}
        >
          {display}
        </text>
      </svg>
      {label && <span className="text-xs text-[color:var(--fg-muted)]">{label}</span>}
    </div>
  );
}
