import express from "express";
import { BatScraper } from "./scraper.js";
import { ScrapeScheduler } from "./scheduler.js";
import { config } from "./config.js";

const app = express();
const scraper = new BatScraper();
const scheduler = new ScrapeScheduler(scraper);

// Health check endpoint (Railway uses this)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    tracked: scheduler.getStatus().length,
    uptime: process.uptime(),
  });
});

// Status endpoint
app.get("/status", (_req, res) => {
  res.json({
    watchProfiles: scheduler.getWatchProfiles(),
    tracked: scheduler.getStatus(),
  });
});

async function main() {
  console.log("[bat-scraper] Starting...");

  // Validate configuration
  if (!config.convexSiteUrl) {
    console.error("[bat-scraper] CONVEX_SITE_URL is required");
    process.exit(1);
  }
  if (!config.scraperSecret) {
    console.error("[bat-scraper] SCRAPER_SECRET is required");
    process.exit(1);
  }

  // Initialize browser
  await scraper.init();

  // Start health check server
  app.listen(config.port, () => {
    console.log(`[bat-scraper] Health server on port ${config.port}`);
  });

  // Start scrape scheduler
  scheduler.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[bat-scraper] Shutting down...");
    scheduler.stop();
    await scraper.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[bat-scraper] Fatal error:", err);
  process.exit(1);
});
