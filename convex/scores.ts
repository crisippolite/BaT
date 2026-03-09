import { query } from "./_generated/server";
import { v } from "convex/values";

// Compute score for an auction against user preferences
export const compute = query({
  args: {
    auctionId: v.id("auctions"),
    prefsJson: v.any(),
  },
  handler: async (ctx, args) => {
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) return null;

    const attributes = await ctx.db
      .query("auctionAttributes")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.auctionId))
      .first();

    const bonusFeatures = await ctx.db
      .query("auctionBonusFeatures")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.auctionId))
      .collect();

    const prefs = args.prefsJson;

    // Pass/fail checks
    if (prefs.passFailCriteria) {
      if (
        prefs.passFailCriteria.noStructuralRust &&
        attributes?.rustNotes &&
        ["moderate", "heavy"].some((level) =>
          attributes.rustNotes!.toLowerCase().includes(level)
        )
      ) {
        return {
          score: 0,
          disqualified: true,
          reason: "Structural rust",
          base: 0,
          bonus: 0,
          breakdown: [],
        };
      }

      if (
        prefs.passFailCriteria.pre1976 &&
        auction.year &&
        auction.year > 1975
      ) {
        return {
          score: 0,
          disqualified: true,
          reason: "Post-1976",
          base: 0,
          bonus: 0,
          breakdown: [],
        };
      }

      if (
        prefs.passFailCriteria.cleanTitle &&
        attributes?.titleStatus &&
        attributes.titleStatus.toLowerCase() !== "clean"
      ) {
        return {
          score: 0,
          disqualified: true,
          reason: "Non-clean title",
          base: 0,
          bonus: 0,
          breakdown: [],
        };
      }
    }

    // Base score (placeholder — will be computed from rubric in Phase 2)
    const base = 60; // Default base until rubric is implemented

    // Bonus from user-weighted features
    let bonus = 0;
    const breakdown: Array<{ key: string; label: string; points: number }> = [];

    for (const feature of bonusFeatures) {
      const userWeight =
        prefs.bonusWeights?.[feature.featureKey] ?? feature.pointsDefault;
      bonus += userWeight;
      breakdown.push({
        key: feature.featureKey,
        label: feature.featureLabel ?? feature.featureKey,
        points: userWeight,
      });
    }

    const score = Math.min(base + bonus, 100);

    return {
      score,
      disqualified: false,
      reason: null,
      base,
      bonus,
      breakdown,
    };
  },
});
