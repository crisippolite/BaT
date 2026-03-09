import { query } from "./_generated/server";
import { v } from "convex/values";

// Compute all signals for an auction
export const getForAuction = query({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) return null;

    // Get bid velocity data
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const allBids = await ctx.db
      .query("bidEvents")
      .withIndex("by_auctionId_scrapedAt", (q) =>
        q.eq("auctionId", args.auctionId)
      )
      .collect();

    const bids1h = allBids.filter((b) => b.scrapedAt >= oneHourAgo);
    const bids6h = allBids.filter((b) => b.scrapedAt >= sixHoursAgo);
    const bids24h = allBids.filter((b) => b.scrapedAt >= twentyFourHoursAgo);

    const velocity1h = bids1h.length;
    const velocity6h = bids6h.length / 6;
    const velocity24h = bids24h.length / 24;

    // Bid velocity classification
    let bidVelocity: string;
    if (allBids.length < 5) {
      bidVelocity = "low_interest";
    } else if (velocity1h > velocity6h * 1.5) {
      bidVelocity = "escalating";
    } else if (velocity1h < velocity6h * 0.5) {
      bidVelocity = "cooling";
    } else {
      bidVelocity = "steady";
    }

    // Get latest prediction
    const prediction = await ctx.db
      .query("predictions")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.auctionId))
      .order("desc")
      .first();

    // Value ratio
    const currentBid = auction.currentBid ?? 0;
    const predictedFinal = prediction?.predictedFinal ?? 0;
    const valueRatio =
      predictedFinal > 0 ? currentBid / predictedFinal : null;

    let valueSignal: string | null = null;
    if (valueRatio !== null) {
      if (valueRatio < 0.7) valueSignal = "strong_value";
      else if (valueRatio < 0.85) valueSignal = "good_value";
      else if (valueRatio < 0.95) valueSignal = "fair";
      else valueSignal = "approaching_ceiling";
    }

    // Last-minute snipe probability (heuristic for v1)
    const hoursRemaining = auction.endTime
      ? (auction.endTime - now) / (1000 * 60 * 60)
      : null;

    let lastMinuteProb = 0.3; // base rate
    if (velocity1h > velocity6h * 1.5) lastMinuteProb += 0.2;
    if (allBids.length > 30) lastMinuteProb += 0.15;
    if (auction.reserveStatus === "met") lastMinuteProb += 0.1;
    if (
      valueRatio !== null &&
      valueRatio > 0.85
    )
      lastMinuteProb += 0.1;
    lastMinuteProb = Math.min(lastMinuteProb, 0.99);

    // Reserve risk
    let reserveRisk = false;
    if (
      auction.reserveStatus === "not_met" &&
      valueRatio !== null &&
      valueRatio > 0.9 &&
      bidVelocity !== "escalating"
    ) {
      reserveRisk = true;
    }

    return {
      lastMinuteProb: Math.round(lastMinuteProb * 100) / 100,
      reserveRisk,
      bidVelocity,
      valueRatio: valueRatio !== null ? Math.round(valueRatio * 100) / 100 : null,
      valueSignal,
      hoursRemaining:
        hoursRemaining !== null
          ? Math.round(hoursRemaining * 10) / 10
          : null,
    };
  },
});

// Get active signals across all auctions (for alerts)
export const getActive = query({
  handler: async (ctx) => {
    const activeAuctions = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    const signals = {
      endingSoon: [] as string[], // auction IDs ending within 1 hour
      highSnipeRisk: [] as string[], // snipe prob > 0.85
      reserveAtRisk: [] as string[], // reserve not met + flat velocity
      newListings: [] as string[], // listed within last 2 hours
    };

    for (const auction of activeAuctions) {
      const hoursRemaining = auction.endTime
        ? (auction.endTime - now) / (1000 * 60 * 60)
        : null;

      if (hoursRemaining !== null && hoursRemaining < 1 && hoursRemaining > 0) {
        signals.endingSoon.push(auction.batId);
      }

      if (
        auction._creationTime &&
        now - auction._creationTime < 2 * 60 * 60 * 1000
      ) {
        signals.newListings.push(auction.batId);
      }

      if (auction.reserveStatus === "not_met") {
        signals.reserveAtRisk.push(auction.batId);
      }
    }

    return signals;
  },
});
