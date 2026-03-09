import { Tag } from "./Tag";

interface SignalBadgeProps {
  type: "velocity" | "snipe" | "value" | "reserve_risk";
  value: string | number | boolean | null;
}

export function SignalBadge({ type, value }: SignalBadgeProps) {
  if (value === null || value === undefined) return null;

  switch (type) {
    case "velocity": {
      const colorMap: Record<string, "green" | "orange" | "red" | "default"> = {
        escalating: "red",
        steady: "default",
        cooling: "blue" as "default",
        low_interest: "default",
      };
      const labelMap: Record<string, string> = {
        escalating: "Escalating",
        steady: "Steady",
        cooling: "Cooling",
        low_interest: "Low Interest",
      };
      return (
        <Tag color={colorMap[String(value)] ?? "default"}>
          {labelMap[String(value)] ?? String(value)}
        </Tag>
      );
    }

    case "snipe": {
      const prob = Number(value);
      if (prob < 0.5) return null;
      return (
        <Tag color={prob > 0.85 ? "red" : "orange"}>
          Snipe {Math.round(prob * 100)}%
        </Tag>
      );
    }

    case "value": {
      const colorMap: Record<string, "green" | "orange" | "default"> = {
        strong_value: "green",
        good_value: "green",
        fair: "default",
        approaching_ceiling: "orange",
      };
      const labelMap: Record<string, string> = {
        strong_value: "Strong Value",
        good_value: "Good Value",
        fair: "Fair",
        approaching_ceiling: "Near Ceiling",
      };
      return (
        <Tag color={colorMap[String(value)] ?? "default"}>
          {labelMap[String(value)] ?? String(value)}
        </Tag>
      );
    }

    case "reserve_risk":
      return value ? <Tag color="red">Reserve at Risk</Tag> : null;

    default:
      return null;
  }
}
