/**
 * A minimal inline trend chart for a metric's values (docs/modules/habits.md
 * §1 metrics: "value input + trend"). No stored aggregation — plots
 * whatever log rows are passed in.
 */
export function TrendChart({
  points,
}: {
  points: { date: string; value: number }[];
}) {
  if (points.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No entries yet — log a value to start the trend.
      </p>
    );
  }

  if (points.length === 1) {
    return (
      <p className="text-xs text-muted-foreground">
        {points[0].value} on {points[0].date} — one more entry to chart a trend.
      </p>
    );
  }

  const width = 240;
  const height = 48;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.value - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full max-w-60 text-primary"
      role="img"
      aria-label={`Trend from ${points[0].value} to ${points[points.length - 1].value}`}
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
