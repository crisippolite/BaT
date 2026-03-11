import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

// Clean up scrape logs older than 7 days
export const cleanupOldLogs = internalAction({
  handler: async (ctx) => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const deleted: number = await ctx.runMutation(
        internal.cronHandlers.deleteBatch,
        { cutoff, limit: BATCH_SIZE }
      );
      totalDeleted += deleted;
      hasMore = deleted === BATCH_SIZE;
    }

    console.log(`Scrape log cleanup: deleted ${totalDeleted} records older than 7 days`);
  },
});

// Batch delete mutation — called repeatedly by the action above
export const deleteBatch = internalMutation({
  args: { cutoff: v.number(), limit: v.number() },
  handler: async (ctx, { cutoff, limit }) => {
    const old = await ctx.db
      .query("scrapeLog")
      .withIndex("by_scrapedAt", (q) => q.lt("scrapedAt", cutoff))
      .take(limit);

    for (const row of old) {
      await ctx.db.delete(row._id);
    }
    return old.length;
  },
});
