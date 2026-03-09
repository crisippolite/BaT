import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get bid history for an auction
export const getHistory = query({
  args: {
    auctionId: v.id("auctions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 500;
    return await ctx.db
      .query("bidEvents")
      .withIndex("by_auctionId_scrapedAt", (q) =>
        q.eq("auctionId", args.auctionId)
      )
      .order("asc")
      .take(limit);
  },
});

// Get latest bid for an auction
export const getLatest = query({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bidEvents")
      .withIndex("by_auctionId_scrapedAt", (q) =>
        q.eq("auctionId", args.auctionId)
      )
      .order("desc")
      .first();
  },
});

// Get bid velocity stats for an auction
export const getVelocity = query({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
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
    const acceleration =
      velocity24h > 0 ? velocity1h / velocity24h : velocity1h;

    let classification: string;
    if (allBids.length < 5) {
      classification = "low_interest";
    } else if (velocity1h > velocity6h * 1.5) {
      classification = "escalating";
    } else if (velocity1h < velocity6h * 0.5) {
      classification = "cooling";
    } else {
      classification = "steady";
    }

    return {
      velocity1h,
      velocity6h,
      velocity24h,
      acceleration,
      classification,
      totalBids: allBids.length,
    };
  },
});

// Internal mutation to insert bid events (from scraper)
export const internalInsertBids = internalMutation({
  args: {
    bids: v.array(
      v.object({
        auctionId: v.id("auctions"),
        bidAmount: v.number(),
        bidCount: v.optional(v.number()),
        reserveMet: v.optional(v.boolean()),
        scrapedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    for (const bid of args.bids) {
      // Deduplicate: skip if same auction + amount already exists
      const existing = await ctx.db
        .query("bidEvents")
        .withIndex("by_auctionId", (q) => q.eq("auctionId", bid.auctionId))
        .filter((q) => q.eq(q.field("bidAmount"), bid.bidAmount))
        .first();

      if (!existing) {
        await ctx.db.insert("bidEvents", bid);
        inserted++;
      }
    }
    return { inserted };
  },
});
