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
import { computeScore } from "../lib/scoring";
import { useAppStore } from "../stores/appStore";

const TABS = [
  { key: "chart", label: "Chart" },
  { key: "attributes", label: "Attributes" },
  { key: "scoring", label: "Scoring" },
];

const SIGNAL_EXPLANATIONS: Record<string, Record<string, string>> = {
  velocity: {
    escalating: "Bid rate in the last hour is 1.5x the 6-hour average — competitive interest is building.",
    steady: "Bidding pace is consistent — neither heating up nor cooling off.",
    cooling: "Bid rate has dropped below half the 6-hour average — interest may be waning.",
    low_interest: "Fewer than 5 total bids — auction hasn't attracted significant attention yet.",
  },
  value: {
    strong_value: "Current bid is below 70% of the predicted final — significant upside remains.",
    good_value: "Current bid is 70–85% of predicted final — reasonable room for growth.",
    fair: "Current bid is 85–95% of predicted final — approaching expected range.",
    approaching_ceiling: "Current bid is above 95% of predicted final — near or at the expected ceiling.",
  },
};

export function DetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chart");
  const { compareIds, toggleCompare } = useAppStore();

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

  const prefs = useQuery(api.preferences.get);

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

  const isCompared = compareIds.includes(auction._id);

  const prefsJson = prefs?.prefsJson ?? null;
  const scoreResult = prefsJson
    ? computeScore(
        {
          year: auction.year,
          rustNotes: auction.attributes?.rustNotes ?? undefined,
          titleStatus: auction.attributes?.titleStatus ?? undefined,
          bonusFeatures: auction.bonusFeatures?.map((f: { featureKey: string; featureLabel?: string; pointsDefault?: number }) => ({
            ...f,
            pointsDefault: f.pointsDefault ?? 0,
          })),
        },
        prefsJson
      )
    : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-sec)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          &larr; Back to feed
        </button>
        <button
          onClick={() => toggleCompare(auction._id)}
          style={{
            background: "none",
            border: "none",
            color: isCompared ? "var(--color-orange)" : "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {isCompared ? "Remove from Compare" : "+ Compare"}
        </button>
      </div>

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
          label="Predicted Final (P50)"
          value={
            auction.prediction
              ? formatPrice(auction.prediction.predictedFinal)
              : "—"
          }
          variant="pred"
        />
        <MetricCell label="Bids" value={String(auction.bidCount ?? 0)} />
        <MetricCell
          label="P10–P90 Range"
          value={
            auction.prediction
              ? `${formatPrice(auction.prediction.confidenceLow)} – ${formatPrice(auction.prediction.confidenceHigh)}`
              : "—"
          }
        />
        {signals?.valueRatio != null && (
          <MetricCell
            label="Value Ratio"
            value={`${Math.round(signals.valueRatio * 100)}%`}
          />
        )}
        {signals?.hoursRemaining != null && (
          <MetricCell
            label="Hours Left"
            value={signals.hoursRemaining > 0 ? `${signals.hoursRemaining}h` : "Ended"}
          />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <ReserveBadge status={auction.reserveStatus as "met" | "not_met" | "unknown"} />
        <TimeLeft endTime={auction.endTime} />
        {auction.location && (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
            {auction.location}
          </span>
        )}
        {scoreResult && !scoreResult.disqualified && (
          <ScoreRing score={scoreResult.score} size={44} />
        )}
        {scoreResult?.disqualified && (
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-red)" }}>
            Disqualified: {scoreResult.reason}
          </span>
        )}
      </div>

      {signals && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <div className="detail-signals">
            <SignalBadge type="velocity" value={signals.bidVelocity} />
            <SignalBadge type="value" value={signals.valueSignal} />
            <SignalBadge type="snipe" value={signals.lastMinuteProb} />
            <SignalBadge type="reserve_risk" value={signals.reserveRisk} />
          </div>
          {signals.bidVelocity && SIGNAL_EXPLANATIONS.velocity[signals.bidVelocity] && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginTop: "var(--space-2)" }}>
              {SIGNAL_EXPLANATIONS.velocity[signals.bidVelocity]}
            </p>
          )}
          {signals.valueSignal && SIGNAL_EXPLANATIONS.value[signals.valueSignal] && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginTop: "var(--space-1)" }}>
              {SIGNAL_EXPLANATIONS.value[signals.valueSignal]}
            </p>
          )}
          {signals.lastMinuteProb != null && signals.lastMinuteProb >= 0.5 && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)", marginTop: "var(--space-1)" }}>
              {Math.round(signals.lastMinuteProb * 100)}% chance of last-minute snipe activity based on velocity, bid count, and reserve status.
            </p>
          )}
          {signals.reserveRisk && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-red)", marginTop: "var(--space-1)" }}>
              Reserve not met with bid near predicted ceiling and slowing velocity — may not sell.
            </p>
          )}
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
          <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
            <ScoreRing score={scoreResult?.score ?? 0} size={80} />
            {scoreResult?.disqualified ? (
              <p style={{ color: "var(--color-red)", marginTop: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                Disqualified: {scoreResult.reason}
              </p>
            ) : scoreResult ? (
              <p style={{ color: "var(--color-text-sec)", marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                Base {scoreResult.base} + Bonus {scoreResult.bonus} = {scoreResult.score}
              </p>
            ) : (
              <p style={{ color: "var(--color-text-sec)", marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                Set your preferences to see a personalized score
              </p>
            )}
          </div>

          {auction.bonusFeatures && auction.bonusFeatures.length > 0 && (
            <>
              <h3 style={{ fontSize: "var(--text-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
                Detected Features
              </h3>
              {auction.bonusFeatures.map((feat: { featureKey: string; featureLabel?: string; pointsDefault?: number }) => {
                const userWeight = prefsJson?.bonusWeights?.[feat.featureKey];
                const effectiveWeight = userWeight ?? feat.pointsDefault ?? 0;
                return (
                  <div key={feat.featureKey} className="prefs-row">
                    <span>{feat.featureLabel ?? feat.featureKey}</span>
                    <span className="mono" style={{ color: effectiveWeight > 0 ? "var(--color-orange)" : "var(--color-text-muted)" }}>
                      +{effectiveWeight}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
