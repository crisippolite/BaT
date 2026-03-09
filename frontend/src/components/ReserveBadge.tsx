interface ReserveBadgeProps {
  status: "met" | "not_met" | "unknown";
}

const labels: Record<string, string> = {
  met: "Reserve Met",
  not_met: "Reserve Not Met",
  unknown: "Reserve Unknown",
};

const classes: Record<string, string> = {
  met: "met",
  not_met: "not-met",
  unknown: "unknown",
};

export function ReserveBadge({ status }: ReserveBadgeProps) {
  return (
    <span className={`reserve-badge ${classes[status] ?? "unknown"}`}>
      {labels[status] ?? "Reserve Unknown"}
    </span>
  );
}
