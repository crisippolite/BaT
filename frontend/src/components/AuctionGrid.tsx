import { AuctionCard } from "./AuctionCard";
import type { Doc } from "../../convex/_generated/dataModel";

type AuctionWithExtras = Doc<"auctions"> & {
  prediction?: { predictedFinal: number; confidenceLow: number; confidenceHigh: number } | null;
  bonusFeatures?: Array<{ featureKey: string; featureLabel?: string }>;
};

interface AuctionGridProps {
  auctions: AuctionWithExtras[];
}

export function AuctionGrid({ auctions }: AuctionGridProps) {
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
        <AuctionCard key={auction._id} auction={auction} />
      ))}
    </div>
  );
}
