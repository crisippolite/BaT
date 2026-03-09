interface MetricCellProps {
  label: string;
  value: string;
  variant?: "bid" | "pred" | "default";
}

export function MetricCell({ label, value, variant = "default" }: MetricCellProps) {
  return (
    <div className="metric-cell">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${variant}`}>{value}</div>
    </div>
  );
}
