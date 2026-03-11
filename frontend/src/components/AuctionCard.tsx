import { useNavigate } from "react-router-dom";
import { MetricCell } from "./MetricCell";
import { ReserveBadge } from "./ReserveBadge";
import { TimeLeft } from "./TimeLeft";
import { ScoreRing } from "./ScoreRing";
import { SignalBadge } from "./SignalBadge";
import { formatPrice } from "../lib/format";
import { useAppStore } from "../stores/appStore";
import type { Doc } from "../../convex/_generated/dataModel";

interface AuctionCardProps {
  auction: Doc<"auctions"> & {
    prediction?: {
      predictedFinal: number;
      confidenceLow: number;
      confidenceHigh: number;
    } | null;
    bonusFeatures?: Array<{ featureKey: string; featureLabel?: string }>;
  };
  score?: number | null;
  signals?: {
    bidVelocity?: string;
    lastMinuteProb?: number;
    valueSignal?: string;
    reserveRisk?: boolean;
  } | null;
}

export function AuctionCard({ auction, score, signals }: AuctionCardProps) {
  const navigate = useNavigate();
  const { compareIds, toggleCompare } = useAppStore();
  const isCompared = compareIds.includes(auction._id);

  return (
    <div
      className={`auction-card ${isCompared ? "compared" : ""}`}
      onClick={() => navigate(`/auction/${auction._id}`)}
    >
      {auction.imageUrl ? (
        <img
          src={auction.imageUrl}
          alt={auction.title}
          className="auction-card-image"
        />
      ) : (
        <div
          className="auction-card-image"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          No image
        </div>
      )}

      <div className="auction-card-body">
        <div className="auction-card-title">{auction.title}</div>
        {auction.subtitle && (
          <div className="auction-card-subtitle">{auction.subtitle}</div>
        )}

        <div className="auction-card-metrics">
          <MetricCell
            label="Current Bid"
            value={formatPrice(auction.currentBid ?? 0)}
            variant="bid"
          />
          <MetricCell
            label="Predicted"
            value={
              auction.prediction
                ? formatPrice(auction.prediction.predictedFinal)
                : "—"
            }
            variant="pred"
          />
          {auction.prediction && (
            <MetricCell
              label="P10–P90"
              value={`${formatPrice(auction.prediction.confidenceLow)}–${formatPrice(auction.prediction.confidenceHigh)}`}
            />
          )}
          <MetricCell
            label="Bids"
            value={String(auction.bidCount ?? 0)}
          />
        </div>

        {signals && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
            <SignalBadge type="velocity" value={signals.bidVelocity ?? null} />
            <SignalBadge type="value" value={signals.valueSignal ?? null} />
            <SignalBadge type="snipe" value={signals.lastMinuteProb ?? null} />
            <SignalBadge type="reserve_risk" value={signals.reserveRisk ?? null} />
          </div>
        )}
      </div>

      <div className="auction-card-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <ReserveBadge status={auction.reserveStatus as "met" | "not_met" | "unknown"} />
          <TimeLeft endTime={auction.endTime} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(auction._id);
            }}
            style={{
              background: "none",
              border: "none",
              color: isCompared ? "var(--color-orange)" : "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "4px 0",
              transition: "color 0.15s",
            }}
          >
            {isCompared ? "Comparing" : "Compare"}
          </button>
          {score != null && <ScoreRing score={score} size={40} />}
        </div>
      </div>
    </div>
  );
}
