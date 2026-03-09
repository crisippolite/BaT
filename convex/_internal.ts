import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutations used by HTTP actions in ingest.ts
// These are separated to keep the ingest HTTP handlers clean

export const internalUpsertAttributes = internalMutation({
  args: {
    auctionId: v.id("auctions"),
    engine: v.optional(v.string()),
    transmission: v.optional(v.string()),
    color: v.optional(v.string()),
    mileage: v.optional(v.string()),
    vin: v.optional(v.string()),
    titleStatus: v.optional(v.string()),
    rustNotes: v.optional(v.string()),
    hasAc: v.optional(v.boolean()),
    rawJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { auctionId, ...attrs } = args;
    const existing = await ctx.db
      .query("auctionAttributes")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", auctionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, attrs);
      return existing._id;
    } else {
      return await ctx.db.insert("auctionAttributes", { auctionId, ...attrs });
    }
  },
});

export const internalLogScrape = internalMutation({
  args: {
    auctionId: v.optional(v.id("auctions")),
    scrapedAt: v.number(),
    status: v.string(),
    errorMsg: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scrapeLog", args);
  },
});

export const internalUpsertBonusFeatures = internalMutation({
  args: {
    auctionId: v.id("auctions"),
    features: v.array(
      v.object({
        featureKey: v.string(),
        featureLabel: v.optional(v.string()),
        pointsDefault: v.number(),
        source: v.string(),
        confidence: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Clear existing auto-detected features
    const existing = await ctx.db
      .query("auctionBonusFeatures")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.auctionId))
      .collect();

    for (const feat of existing.filter((f) => f.source === "auto")) {
      await ctx.db.delete(feat._id);
    }

    // Insert new features
    for (const feature of args.features) {
      await ctx.db.insert("auctionBonusFeatures", {
        auctionId: args.auctionId,
        ...feature,
      });
    }
  },
});
