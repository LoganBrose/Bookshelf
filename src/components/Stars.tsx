interface Props {
  value: number;
  max: 5 | 10;
  size?: number;
}

/** A row of `max` stars, filled proportionally (8.4 / 10 → 8.4 stars lit). */
export function Stars({ value, max, size = 16 }: Props) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const row = '★'.repeat(max);
  return (
    <span
      className="stars"
      style={{ fontSize: size }}
      role="img"
      aria-label={`${formatRating(value)} out of ${max}`}
    >
      <span className="stars-empty">{row}</span>
      <span className="stars-fill" style={{ width: `${pct}%` }}>
        {row}
      </span>
    </span>
  );
}

export const formatRating = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export const formatCount = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
      : String(n);
