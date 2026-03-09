import { query } from "./_generated/server";

// Market statistics for BMW 2002 category
export const getStats = query({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Get ended auctions in last 30 days with final price
    const recentSales = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "ended"))
      .collect();

    const recentWithPrice = recentSales.filter(
      (a) =>
        a.finalPrice != null &&
        a._creationTime >= thirtyDaysAgo
    );

    // Compute median
    const prices = recentWithPrice
      .map((a) => a.finalPrice!)
      .sort((a, b) => a - b);

    const median =
      prices.length > 0
        ? prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)]
        : null;

    // Average
    const average =
      prices.length > 0
        ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
        : null;

    // Most recent sale
    const mostRecent = recentWithPrice.sort(
      (a, b) => b._creationTime - a._creationTime
    )[0];

    const daysSinceLastSale = mostRecent
      ? Math.round(
          (Date.now() - mostRecent._creationTime) / (1000 * 60 * 60 * 24)
        )
      : null;

    // Active count
    const activeAuctions = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return {
      median30d: median,
      average30d: average,
      volume30d: prices.length,
      high30d: prices.length > 0 ? prices[prices.length - 1] : null,
      low30d: prices.length > 0 ? prices[0] : null,
      daysSinceLastSale,
      activeCount: activeAuctions.length,
    };
  },
});
