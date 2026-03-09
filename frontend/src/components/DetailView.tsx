import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MetricCell } from "./MetricCell";
import { ReserveBadge } from "./ReserveBadge";
import { TimeLeft } from "./TimeLeft";
import { ScoreRing } from "./ScoreRing";
import { SignalBadge } from "./SignalBadge";
import { TabBar } from "./TabBar";
import { BidChart } from "./BidChart";
import { formatPrice } from "../lib/format";

const TABS = [
  { key: "chart", label: "Chart" },
  { key: "attributes", label: "Attributes" },
  { key: "scoring", label: "Scoring" },
];

export function DetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chart");

  const auction = useQuery(
    api.auctions.getById,
    id ? { id: id as Id<"auctions"> } : "skip"
  );

  const bids = useQuery(
    api.bids.getHistory,
    id ? { auctionId: id as Id<"auctions"> } : "skip"
  );

  const signals = useQuery(
    api.signals.getForAuction,
    id ? { auctionId: id as Id<"auctions"> } : "skip"
  );

  if (auction === undefined) {
    return <div className="loading">Loading auction...</div>;
  }

  if (auction === null) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Auction not found</div>
        <button onClick={() => navigate("/")} style={{ color: "var(--color-orange)", cursor: "pointer", background: "none", border: "none", fontSize: "var(--text-base)" }}>
          Back to feed
        </button>
      </div>
    );
  }

  const bidChartData = (bids ?? []).map((b: { scrapedAt: number; bidAmount: number }) => ({
    time: b.scrapedAt,
    bidAmount: b.bidAmount,
  }));

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-sec)",
          fontSize: "var(--text-sm)",
          marginBottom: "var(--space-4)",
          cursor: "pointer",
        }}
      >
        &larr; Back to feed
      </button>

      <div className="detail-header">
        <h1 className="detail-title">{auction.title}</h1>
        {auction.subtitle && (
          <div className="detail-subtitle">{auction.subtitle}</div>
        )}
      </div>

      <div className="detail-metrics">
        <MetricCell
          label="Current Bid"
          value={formatPrice(auction.currentBid ?? 0)}
          variant="bid"
        />
        <MetricCell
          label="Predicted Final"
          value={
            auction.prediction
              ? formatPrice(auction.prediction.predictedFinal)
              : "—"
          }
          variant="pred"
        />
        <MetricCell label="Bids" value={String(auction.bidCount ?? 0)} />
        <MetricCell
          label="Confidence"
          value={
            auction.prediction
              ? `${formatPrice(auction.prediction.confidenceLow)} – ${formatPrice(auction.prediction.confidenceHigh)}`
              : "—"
          }
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <ReserveBadge status={auction.reserveStatus as "met" | "not_met" | "unknown"} />
        <TimeLeft endTime={auction.endTime} />
        {auction.location && (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
            {auction.location}
          </span>
        )}
      </div>

      {signals && (
        <div className="detail-signals">
          <SignalBadge type="velocity" value={signals.bidVelocity} />
          <SignalBadge type="snipe" value={signals.lastMinuteProb} />
          <SignalBadge type="value" value={signals.valueSignal} />
          <SignalBadge type="reserve_risk" value={signals.reserveRisk} />
        </div>
      )}

      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "chart" && (
        <BidChart
          bids={bidChartData}
          prediction={auction.prediction}
          endTime={auction.endTime}
        />
      )}

      {activeTab === "attributes" && (
        <div className="prefs-section">
          {auction.attributes ? (
            <div>
              {Object.entries(auction.attributes)
                .filter(([k]) => k !== "rawJson" && k !== "_id" && k !== "_creationTime" && k !== "auctionId")
                .map(([key, value]) => (
                  <div key={key} className="prefs-row">
                    <span className="prefs-label" style={{ textTransform: "capitalize" }}>
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="mono">{String(value ?? "—")}</span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty-state">No attributes available</div>
          )}
        </div>
      )}

      {activeTab === "scoring" && (
        <div className="prefs-section">
          <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
            <ScoreRing score={0} size={80} />
            <p style={{ color: "var(--color-text-sec)", marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>
              Set your preferences to see a score
            </p>
          </div>

          {auction.bonusFeatures && auction.bonusFeatures.length > 0 && (
            <>
              <h3 style={{ fontSize: "var(--text-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
                Bonus Features
              </h3>
              {auction.bonusFeatures.map((feat: { featureKey: string; featureLabel?: string; pointsDefault?: number }) => (
                <div key={feat.featureKey} className="prefs-row">
                  <span>{feat.featureLabel ?? feat.featureKey}</span>
                  <span className="mono" style={{ color: "var(--color-orange)" }}>
                    +{feat.pointsDefault}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
