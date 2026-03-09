import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// List auctions with filtering and sorting
export const list = query({
  args: {
    status: v.optional(v.string()),
    sort: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const status = args.status ?? "active";

    let auctions;
    if (status === "all") {
      auctions = await ctx.db.query("auctions").order("desc").take(limit);
    } else {
      auctions = await ctx.db
        .query("auctions")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
    }

    // Enrich with latest prediction for each auction
    const enriched = await Promise.all(
      auctions.map(async (auction) => {
        const prediction = await ctx.db
          .query("predictions")
          .withIndex("by_auctionId", (q) => q.eq("auctionId", auction._id))
          .order("desc")
          .first();

        const bonusFeatures = await ctx.db
          .query("auctionBonusFeatures")
          .withIndex("by_auctionId", (q) => q.eq("auctionId", auction._id))
          .collect();

        return {
          ...auction,
          prediction: prediction ?? null,
          bonusFeatures,
        };
      })
    );

    return enriched;
  },
});

// Get single auction by ID
export const getById = query({
  args: { id: v.id("auctions") },
  handler: async (ctx, args) => {
    const auction = await ctx.db.get(args.id);
    if (!auction) return null;

    const attributes = await ctx.db
      .query("auctionAttributes")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.id))
      .first();

    const prediction = await ctx.db
      .query("predictions")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.id))
      .order("desc")
      .first();

    const bonusFeatures = await ctx.db
      .query("auctionBonusFeatures")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.id))
      .collect();

    return {
      ...auction,
      attributes: attributes ?? null,
      prediction: prediction ?? null,
      bonusFeatures,
    };
  },
});

// Get auction by BaT ID (slug)
export const getByBatId = query({
  args: { batId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auctions")
      .withIndex("by_batId", (q) => q.eq("batId", args.batId))
      .first();
  },
});

// Upsert auction (used by scraper ingestion)
export const upsert = mutation({
  args: {
    batId: v.string(),
    batUrl: v.string(),
    title: v.string(),
    year: v.optional(v.number()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    location: v.optional(v.string()),
    sellerUsername: v.optional(v.string()),
    description: v.optional(v.string()),
    endTime: v.optional(v.number()),
    status: v.string(),
    currentBid: v.optional(v.number()),
    bidCount: v.optional(v.number()),
    finalPrice: v.optional(v.number()),
    reserveStatus: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("auctions")
      .withIndex("by_batId", (q) => q.eq("batId", args.batId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("auctions", args);
    }
  },
});

// Internal mutation for scraper ingestion (called from HTTP action)
export const internalUpsert = internalMutation({
  args: {
    batId: v.string(),
    batUrl: v.string(),
    title: v.string(),
    year: v.optional(v.number()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    location: v.optional(v.string()),
    sellerUsername: v.optional(v.string()),
    description: v.optional(v.string()),
    endTime: v.optional(v.number()),
    status: v.string(),
    currentBid: v.optional(v.number()),
    bidCount: v.optional(v.number()),
    finalPrice: v.optional(v.number()),
    reserveStatus: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("auctions")
      .withIndex("by_batId", (q) => q.eq("batId", args.batId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("auctions", args);
    }
  },
});
