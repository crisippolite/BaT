import cron from "node-cron";
import { config, getIntervalForAuction } from "./config.js";
import { BatScraper } from "./scraper.js";

interface TrackedAuction {
  batId: string;
  batUrl: string;
  endTime: number | null;
  lastScraped: number;
  nextScrape: number;
}

export class ScrapeScheduler {
  private scraper: BatScraper;
  private trackedAuctions: Map<string, TrackedAuction> = new Map();
  private discoveryTask: cron.ScheduledTask | null = null;
  private scrapeLoop: NodeJS.Timeout | null = null;
  private running = false;

  constructor(scraper: BatScraper) {
    this.scraper = scraper;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Discovery: check for new auctions every 30 minutes
    this.discoveryTask = cron.schedule("*/30 * * * *", () => {
      this.runDiscovery().catch((err) =>
        console.error("[scheduler] Discovery error:", err)
      );
    });

    // Run discovery immediately on start
    this.runDiscovery().catch((err) =>
      console.error("[scheduler] Initial discovery error:", err)
    );

    // Start the scrape loop (checks every 30s which auctions need scraping)
    this.scrapeLoop = setInterval(() => {
      this.processScrapeQueue().catch((err) =>
        console.error("[scheduler] Scrape loop error:", err)
      );
    }, 30_000);

    console.log("[scheduler] Started");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;
    this.discoveryTask?.stop();
    if (this.scrapeLoop) clearInterval(this.scrapeLoop);
    console.log("[scheduler] Stopped");
  }

  /**
   * Discover new auctions and add them to tracking
   */
  private async runDiscovery(): Promise<void> {
    console.log("[scheduler] Running auction discovery...");
    const listings = await this.scraper.discoverAuctions();

    for (const listing of listings) {
      if (!this.trackedAuctions.has(listing.batId)) {
        this.trackedAuctions.set(listing.batId, {
          batId: listing.batId,
          batUrl: listing.batUrl,
          endTime: null, // Will be populated after first scrape
          lastScraped: 0,
          nextScrape: Date.now(), // Scrape immediately
        });
        console.log(`[scheduler] Tracking new auction: ${listing.batId}`);
      }
    }

    console.log(
      `[scheduler] Tracking ${this.trackedAuctions.size} auctions`
    );
  }

  /**
   * Process the scrape queue — scrape auctions that are due
   */
  private async processScrapeQueue(): Promise<void> {
    const now = Date.now();
    const due: TrackedAuction[] = [];

    for (const auction of this.trackedAuctions.values()) {
      // Skip ended auctions (endTime in the past by > 2h)
      if (
        auction.endTime &&
        auction.endTime < now - 2 * 60 * 60 * 1000
      ) {
        this.trackedAuctions.delete(auction.batId);
        continue;
      }

      if (auction.nextScrape <= now) {
        due.push(auction);
      }
    }

    // Sort by urgency (closest to ending first)
    due.sort((a, b) => {
      const aUrgency = a.endTime ? a.endTime - now : Infinity;
      const bUrgency = b.endTime ? b.endTime - now : Infinity;
      return aUrgency - bUrgency;
    });

    // Scrape one at a time (rate limiting)
    for (const auction of due) {
      if (!this.running) break;

      const result = await this.scraper.scrapeAuction(auction.batUrl);

      if (result) {
        // Update tracking info
        auction.lastScraped = Date.now();
        auction.endTime = result.endTime ?? auction.endTime;

        // Calculate next scrape time
        const hoursRemaining = auction.endTime
          ? (auction.endTime - Date.now()) / (1000 * 60 * 60)
          : 48;

        const interval = getIntervalForAuction(hoursRemaining);
        auction.nextScrape = Date.now() + interval;

        // Remove if auction has ended and we've captured final data
        if (result.status === "ended" || result.status === "no_sale") {
          console.log(
            `[scheduler] Auction ended: ${auction.batId} — final price: $${result.finalPrice}`
          );
          // Keep for 2h for final scrape, then remove
          auction.nextScrape = Date.now() + 2 * 60 * 60 * 1000;
        }
      } else {
        // Retry in 5 minutes on failure
        auction.nextScrape = Date.now() + 5 * 60 * 1000;
      }
    }
  }

  /**
   * Manually add an auction to track
   */
  addAuction(batId: string, batUrl: string, endTime?: number): void {
    this.trackedAuctions.set(batId, {
      batId,
      batUrl,
      endTime: endTime ?? null,
      lastScraped: 0,
      nextScrape: Date.now(),
    });
  }

  /**
   * Get status of all tracked auctions
   */
  getStatus(): Array<{
    batId: string;
    endTime: number | null;
    lastScraped: number;
    nextScrape: number;
  }> {
    return Array.from(this.trackedAuctions.values()).map((a) => ({
      batId: a.batId,
      endTime: a.endTime,
      lastScraped: a.lastScraped,
      nextScrape: a.nextScrape,
    }));
  }
}
