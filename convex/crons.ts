import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cleanup old scrape logs (older than 7 days) — runs daily at 3am UTC
crons.daily(
  "cleanup-scrape-logs",
  { hourUTC: 3, minuteUTC: 0 },
  internal.cronHandlers.cleanupOldLogs
);

export default crons;
