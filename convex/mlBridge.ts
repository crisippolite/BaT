import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Internal action: Call the ML service to get a prediction for an auction,
 * then store the result in the predictions table.
 *
 * Triggered after auction data is ingested from the scraper.
 */
export const requestPrediction = internalAction({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (!mlServiceUrl) {
      console.log("[mlBridge] ML_SERVICE_URL not set — skipping prediction");
      return;
    }

    // Gather auction data and features
    const auctionData = await ctx.runQuery(
      internal.mlBridge.getAuctionFeatures,
      { auctionId: args.auctionId }
    );

    if (!auctionData) {
      console.log(`[mlBridge] No auction data for ${args.auctionId}`);
      return;
    }

    // Call ML service
    try {
      const response = await fetch(`${mlServiceUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auctionData.features),
      });

      if (!response.ok) {
        console.error(
          `[mlBridge] ML service returned ${response.status}: ${await response.text()}`
        );
        return;
      }

      const prediction = (await response.json()) as {
        predicted_final: number;
        confidence_low: number;
        confidence_high: number;
        model_version: string;
        features_used: Record<string, number>;
      };

      // Store prediction in Convex
      await ctx.runMutation(internal.predictions.store, {
        auctionId: args.auctionId,
        predictedAt: Date.now(),
        modelVersion: prediction.model_version,
        predictedFinal: prediction.predicted_final,
        confidenceLow: prediction.confidence_low,
        confidenceHigh: prediction.confidence_high,
        featuresJson: prediction.features_used,
      });

      console.log(
        `[mlBridge] Prediction stored for ${args.auctionId}: $${prediction.predicted_final} [${prediction.confidence_low}-${prediction.confidence_high}]`
      );
    } catch (error) {
      console.error(
        `[mlBridge] Failed to call ML service:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  },
});

/**
 * Internal query: Gather all features needed for an ML prediction request.
 * Combines auction data, attributes, bid velocity, and market context.
 */
export const getAuctionFeatures = internalQuery({
  args: { auctionId: v.id("auctions") },
  handler: async (ctx, args) => {
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) return null;

    // Get attributes
    const attributes = await ctx.db
      .query("auctionAttributes")
      .withIndex("by_auctionId", (q) => q.eq("auctionId", args.auctionId))
      .first();

    // Compute bid velocity
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

    // Hours remaining
    const hoursRemaining = auction.endTime
      ? Math.max(0, (auction.endTime - now) / (1000 * 60 * 60))
      : 48.0;

    // Market context (30-day stats from ended auctions)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentSales = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "ended"))
      .collect();

    const recentWithPrice = recentSales.filter(
      (a) => a.finalPrice != null && a._creationTime >= thirtyDaysAgo
    );
    const prices = recentWithPrice
      .map((a) => a.finalPrice!)
      .sort((a, b) => a - b);
    const median =
      prices.length > 0
        ? prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)]
        : null;

    // Detect features from title and attributes
    const titleLower = (auction.title ?? "").toLowerCase();
    const engineLower = (attributes?.engine ?? "").toLowerCase();
    const isTii =
      titleLower.includes("tii") || engineLower.includes("injection");
    const hasAc = attributes?.hasAc ?? titleLower.includes(" ac ");
    const has5speed =
      (attributes?.transmission ?? "").toLowerCase().includes("5-speed") ||
      titleLower.includes("5-speed");

    // Build the ML request payload (matches PredictionRequest schema)
    const features = {
      year_of_car: auction.year ?? 1972,
      is_tii: isTii,
      has_ac: typeof hasAc === "boolean" ? hasAc : false,
      has_5_speed: has5speed,
      engine_swap_type: "none" as string,
      has_widebody: titleLower.includes("widebody") || titleLower.includes("wide body"),
      has_recaro: titleLower.includes("recaro"),
      has_ducktail: titleLower.includes("ducktail"),
      has_lsd: titleLower.includes("lsd") || titleLower.includes("limited slip"),
      mileage_band: "unknown" as string,
      rust_grade: "unknown" as string,
      color_desirability: 0.5,
      location_region: "unknown" as string,
      current_bid: auction.currentBid ?? 0,
      bid_count: auction.bidCount ?? allBids.length,
      hours_remaining: hoursRemaining,
      bid_velocity_1h: velocity1h,
      bid_velocity_6h: velocity6h,
      bid_velocity_24h: velocity24h,
      reserve_met: auction.reserveStatus === "met",
      category_median_30d: median ?? 25000,
      category_volume_30d: prices.length,
    };

    // Refine from attributes if available
    if (attributes) {
      // Mileage band
      const mileageStr = attributes.mileage ?? "";
      const mileageNum = parseInt(mileageStr.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(mileageNum)) {
        if (mileageNum < 50000) features.mileage_band = "<50k";
        else if (mileageNum < 100000) features.mileage_band = "50-100k";
        else if (mileageNum < 150000) features.mileage_band = "100-150k";
        else features.mileage_band = ">150k";
      }

      // Rust grade from notes
      const rustLower = (attributes.rustNotes ?? "").toLowerCase();
      if (rustLower.includes("none") || rustLower.includes("rust-free")) {
        features.rust_grade = "none";
      } else if (rustLower.includes("minor") || rustLower.includes("light")) {
        features.rust_grade = "minor";
      } else if (rustLower.includes("moderate") || rustLower.includes("some")) {
        features.rust_grade = "moderate";
      } else if (rustLower.includes("heavy") || rustLower.includes("significant")) {
        features.rust_grade = "heavy";
      }

      // Engine swap detection
      if (engineLower.includes("s14")) features.engine_swap_type = "s14";
      else if (engineLower.includes("m42")) features.engine_swap_type = "m42";
      else if (engineLower.includes("f20c")) features.engine_swap_type = "f20c";
      else if (
        engineLower.includes("swap") ||
        engineLower.includes("converted")
      ) {
        features.engine_swap_type = "other";
      }
    }

    return { features };
  },
});

/**
 * Internal query: Export completed auctions with attributes for ML training.
 * Returns data in a format ready for the training pipeline.
 */
export const getTrainingData = internalQuery({
  handler: async (ctx) => {
    // Get all ended auctions with a final price
    const ended = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "ended"))
      .collect();

    const withPrice = ended.filter((a) => a.finalPrice != null);

    const rows = await Promise.all(
      withPrice.map(async (auction) => {
        const attributes = await ctx.db
          .query("auctionAttributes")
          .withIndex("by_auctionId", (q) => q.eq("auctionId", auction._id))
          .first();

        const bidCount = await ctx.db
          .query("bidEvents")
          .withIndex("by_auctionId", (q) => q.eq("auctionId", auction._id))
          .collect();

        const bonusFeatures = await ctx.db
          .query("auctionBonusFeatures")
          .withIndex("by_auctionId", (q) => q.eq("auctionId", auction._id))
          .collect();

        return {
          batId: auction.batId,
          title: auction.title,
          year: auction.year,
          finalPrice: auction.finalPrice,
          currentBid: auction.currentBid,
          bidCount: auction.bidCount ?? bidCount.length,
          reserveStatus: auction.reserveStatus,
          endTime: auction.endTime,
          location: auction.location,
          engine: attributes?.engine ?? null,
          transmission: attributes?.transmission ?? null,
          color: attributes?.color ?? null,
          mileage: attributes?.mileage ?? null,
          rustNotes: attributes?.rustNotes ?? null,
          hasAc: attributes?.hasAc ?? null,
          bonusFeatures: bonusFeatures.map((f) => f.featureKey),
        };
      })
    );

    return rows;
  },
});
