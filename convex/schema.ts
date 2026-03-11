import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Master auction records
  auctions: defineTable({
    batId: v.string(), // e.g. "bat-141832"
    batUrl: v.string(),
    title: v.string(),
    year: v.optional(v.number()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    location: v.optional(v.string()),
    sellerUsername: v.optional(v.string()),
    description: v.optional(v.string()),
    endTime: v.optional(v.number()), // Unix timestamp ms
    status: v.string(), // "active" | "ended" | "no_sale"
    currentBid: v.optional(v.number()),
    bidCount: v.optional(v.number()),
    finalPrice: v.optional(v.number()),
    reserveStatus: v.string(), // "met" | "not_met" | "unknown"
    imageUrl: v.optional(v.string()),
  })
    .index("by_batId", ["batId"])
    .index("by_status", ["status"])
    .index("by_endTime", ["endTime"])
    .index("by_status_endTime", ["status", "endTime"]),

  // Vehicle attributes parsed from listing
  auctionAttributes: defineTable({
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
  }).index("by_auctionId", ["auctionId"]),

  // Immutable bid events — never update, always insert
  bidEvents: defineTable({
    auctionId: v.id("auctions"),
    bidAmount: v.number(),
    bidCount: v.optional(v.number()),
    reserveMet: v.optional(v.boolean()),
    scrapedAt: v.number(), // Unix timestamp ms
  })
    .index("by_auctionId", ["auctionId"])
    .index("by_auctionId_scrapedAt", ["auctionId", "scrapedAt"])
    .index("by_scrapedAt", ["scrapedAt"]),

  // Scrape run log
  scrapeLog: defineTable({
    auctionId: v.optional(v.id("auctions")),
    scrapedAt: v.number(),
    status: v.string(), // "success" | "error" | "skipped"
    errorMsg: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  })
    .index("by_auctionId", ["auctionId"])
    .index("by_scrapedAt", ["scrapedAt"]),

  // Bonus features identified on each auction
  auctionBonusFeatures: defineTable({
    auctionId: v.id("auctions"),
    featureKey: v.string(), // e.g. "has_ac", "s14_swap"
    featureLabel: v.optional(v.string()),
    pointsDefault: v.number(),
    source: v.string(), // "auto" | "manual"
    confidence: v.optional(v.number()),
  }).index("by_auctionId", ["auctionId"]),

  // ML predictions
  predictions: defineTable({
    auctionId: v.id("auctions"),
    predictedAt: v.number(),
    modelVersion: v.string(),
    predictedFinal: v.number(),
    confidenceLow: v.number(),
    confidenceHigh: v.number(),
    featuresJson: v.optional(v.any()),
  })
    .index("by_auctionId", ["auctionId"])
    .index("by_auctionId_predictedAt", ["auctionId", "predictedAt"]),

  // User preferences for scoring and alerts
  userPreferences: defineTable({
    name: v.string(),
    isDefault: v.boolean(),
    prefsJson: v.any(), // Full preferences object (see spec)
    token: v.optional(v.string()), // Anonymous token (legacy)
    userId: v.optional(v.string()), // Clerk user ID
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),
});
