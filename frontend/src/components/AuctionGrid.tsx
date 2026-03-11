import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuctionCard } from "./AuctionCard";
import { computeScore } from "../lib/scoring";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type AuctionWithExtras = Doc<"auctions"> & {
  prediction?: { predictedFinal: number; confidenceLow: number; confidenceHigh: number } | null;
  bonusFeatures?: Array<{ featureKey: string; featureLabel?: string; pointsDefault: number }>;
};

interface AuctionGridProps {
  auctions: AuctionWithExtras[];
  prefsJson: Record<string, any> | null;
}

function AuctionCardWithSignals({
  auction,
  prefsJson,
}: {
  auction: AuctionWithExtras;
  prefsJson: Record<string, any> | null;
}) {
  const signals = useQuery(api.signals.getForAuction, {
    auctionId: auction._id as Id<"auctions">,
  });

  const score = prefsJson
    ? computeScore(
        {
          year: auction.year,
          bonusFeatures: auction.bonusFeatures?.map((f) => ({
            ...f,
            pointsDefault: f.pointsDefault ?? 0,
          })),
        },
        prefsJson
      )
    : null;

  return (
    <AuctionCard
      auction={auction}
      score={score?.disqualified ? 0 : (score?.score ?? null)}
      signals={signals}
    />
  );
}

export function AuctionGrid({ auctions, prefsJson }: AuctionGridProps) {
  if (auctions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No auctions found</div>
        <p>Check back soon — new BMW 2002 listings appear regularly on BaT.</p>
      </div>
    );
  }

  return (
    <div className="auction-grid">
      {auctions.map((auction) => (
        <AuctionCardWithSignals
          key={auction._id}
          auction={auction}
          prefsJson={prefsJson}
        />
      ))}
    </div>
  );
}
