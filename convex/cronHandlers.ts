import { internalAction } from "./_generated/server";

// Clean up scrape logs older than 7 days
export const cleanupOldLogs = internalAction({
  handler: async (ctx) => {
    // TODO: Implement log cleanup
    // Convex doesn't support bulk deletes natively yet,
    // so this would iterate and delete old records
    console.log("Scrape log cleanup triggered");
  },
});
