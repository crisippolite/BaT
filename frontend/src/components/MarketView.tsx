import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MetricCell } from "./MetricCell";
import { formatPrice } from "../lib/format";

export function MarketView() {
  const stats = useQuery(api.market.getStats);

  return (
    <div>
      <h1 className="page-title">Market Overview</h1>
      <p style={{ color: "var(--color-text-sec)", marginBottom: "var(--space-6)" }}>
        BMW 2002 market trends from Bring a Trailer auctions (last 30 days).
      </p>

      {stats === undefined ? (
        <div className="loading">Loading market data...</div>
      ) : (
        <div className="detail-metrics">
          <MetricCell
            label="Median Price (30d)"
            value={stats.median30d ? formatPrice(stats.median30d) : "—"}
            variant="bid"
          />
          <MetricCell
            label="Average Price (30d)"
            value={stats.average30d ? formatPrice(stats.average30d) : "—"}
          />
          <MetricCell
            label="Volume (30d)"
            value={String(stats.volume30d)}
          />
          <MetricCell
            label="High (30d)"
            value={stats.high30d ? formatPrice(stats.high30d) : "—"}
          />
          <MetricCell
            label="Low (30d)"
            value={stats.low30d ? formatPrice(stats.low30d) : "—"}
          />
          <MetricCell
            label="Active Listings"
            value={String(stats.activeCount)}
            variant="bid"
          />
          <MetricCell
            label="Days Since Last Sale"
            value={stats.daysSinceLastSale != null ? `${stats.daysSinceLastSale}d` : "—"}
          />
        </div>
      )}
    </div>
  );
}
