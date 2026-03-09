import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get latest prediction for an auction
export const getLatest = query({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("predictions")
      .withIndex("by_auctionId_predictedAt", (q) =>
        q.eq("auctionId", args.auctionId)
      )
      .order("desc")
      .first();
  },
});

// Get prediction history for an auction
export const getHistory = query({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("predictions")
      .withIndex("by_auctionId_predictedAt", (q) =>
        q.eq("auctionId", args.auctionId)
      )
      .order("desc")
      .take(20);
  },
});

// Store a new prediction (called from ML service via HTTP action)
export const store = internalMutation({
  args: {
    auctionId: v.id("auctions"),
    predictedAt: v.number(),
    modelVersion: v.string(),
    predictedFinal: v.number(),
    confidenceLow: v.number(),
    confidenceHigh: v.number(),
    featuresJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("predictions", args);
  },
});
