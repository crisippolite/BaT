import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "../lib/format";

interface BidDataPoint {
  time: number;
  bidAmount: number;
}

interface BidChartProps {
  bids: BidDataPoint[];
  prediction?: {
    predictedFinal: number;
    confidenceLow: number;
    confidenceHigh: number;
  } | null;
  endTime?: number | null;
}

export function BidChart({ bids, prediction, endTime }: BidChartProps) {
  if (bids.length === 0) {
    return (
      <div className="empty-state">
        <p>No bid history available yet.</p>
      </div>
    );
  }

  // Last-minute zone: final 60 seconds before end
  const lastMinuteStart = endTime ? endTime - 60 * 1000 : undefined;

  return (
    <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-lg)" }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={bids} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 6"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => {
              const d = new Date(t);
              return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
            }}
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          />
          <YAxis
            tickFormatter={(v: number) => formatPrice(v)}
            tick={{ fontSize: 11, fill: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-dropdown)",
              fontFamily: "var(--font-mono)",
            }}
            formatter={(value: number) => [formatPrice(value), "Bid"]}
            labelFormatter={(t: number) => new Date(t).toLocaleString()}
          />

          {/* Actual bid line */}
          <Line
            type="stepAfter"
            dataKey="bidAmount"
            stroke="var(--color-orange)"
            strokeWidth={2.5}
            dot={false}
            name="Bid"
          />

          {/* Prediction reference lines */}
          {prediction && (
            <>
              <ReferenceLine
                y={prediction.predictedFinal}
                stroke="var(--color-blue)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: `${formatPrice(prediction.predictedFinal)}`,
                  position: "right",
                  fill: "var(--color-blue)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <ReferenceLine
                y={prediction.confidenceLow}
                stroke="var(--color-blue)"
                strokeOpacity={0.3}
                strokeDasharray="3 6"
              />
              <ReferenceLine
                y={prediction.confidenceHigh}
                stroke="var(--color-blue)"
                strokeOpacity={0.3}
                strokeDasharray="3 6"
              />
            </>
          )}

          {/* Last-minute snipe zone */}
          {lastMinuteStart && endTime && (
            <ReferenceArea
              x1={lastMinuteStart}
              x2={endTime}
              fill="var(--color-red)"
              fillOpacity={0.05}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
