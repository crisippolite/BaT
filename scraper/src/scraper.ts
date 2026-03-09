import { chromium, type Browser, type BrowserContext } from "playwright";
import { config, getRandomUserAgent, withJitter } from "./config.js";
import {
  parseAuctionPage,
  parseSearchPage,
  type ParsedAuction,
  type DiscoveredListing,
} from "./parser.js";

export class BatScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private lastRequestTime = 0;

  async init(): Promise<void> {
    const launchOptions: Record<string, unknown> = {
      headless: config.headless,
    };

    if (config.proxyUrl) {
      launchOptions.proxy = { server: config.proxyUrl };
    }

    this.browser = await chromium.launch(launchOptions);
    this.context = await this.browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1280, height: 800 },
    });

    console.log("[scraper] Browser initialized");
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    console.log("[scraper] Browser closed");
  }

  /**
   * Scrape a single auction page and push data to Convex
   */
  async scrapeAuction(url: string): Promise<ParsedAuction | null> {
    if (!this.context) throw new Error("Browser not initialized");

    await this.rateLimit();
    const startTime = Date.now();

    const page = await this.context.newPage();
    try {
      // Rotate user agent per request
      await page.setExtraHTTPHeaders({
        "User-Agent": getRandomUserAgent(),
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for auction data to load
      await page.waitForSelector("h1, .post-title, [data-auction-id]", {
        timeout: 10000,
      }).catch(() => {
        // Non-critical — page might have loaded differently
      });

      const auctionData = await parseAuctionPage(page, url);
      const duration = Date.now() - startTime;

      if (auctionData) {
        // Push to Convex
        await this.pushAuctionToConvex(auctionData);
        await this.logScrape(null, "success", undefined, duration);
        console.log(
          `[scraper] Scraped ${auctionData.batId}: $${auctionData.currentBid} (${duration}ms)`
        );
      } else {
        await this.logScrape(null, "error", "Failed to parse auction data", duration);
        console.warn(`[scraper] Failed to parse: ${url}`);
      }

      return auctionData;
    } catch (error) {
      const duration = Date.now() - startTime;
      const msg = error instanceof Error ? error.message : String(error);
      await this.logScrape(null, "error", msg, duration);
      console.error(`[scraper] Error scraping ${url}:`, msg);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Discover new BMW 2002 auctions from BaT search page
   */
  async discoverAuctions(): Promise<DiscoveredListing[]> {
    if (!this.context) throw new Error("Browser not initialized");

    await this.rateLimit();

    const page = await this.context.newPage();
    try {
      await page.goto(config.batSearchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for listing grid to load
      await page
        .waitForSelector(".auction-item, .listing-card", { timeout: 10000 })
        .catch(() => {});

      const listings = await parseSearchPage(page);
      console.log(`[scraper] Discovered ${listings.length} listings`);
      return listings;
    } catch (error) {
      console.error("[scraper] Discovery error:", error);
      return [];
    } finally {
      await page.close();
    }
  }

  /**
   * Push scraped auction data to Convex via HTTP action
   */
  private async pushAuctionToConvex(auction: ParsedAuction): Promise<void> {
    const url = `${config.convexSiteUrl}/ingest/auction`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.scraperSecret}`,
      },
      body: JSON.stringify(auction),
    });

    if (!response.ok) {
      throw new Error(
        `Convex ingest failed: ${response.status} ${await response.text()}`
      );
    }

    // Push bid events separately if available
    if (auction.bids && auction.bids.length > 0) {
      const auctionResult = (await response.json()) as { auctionId: string };
      await this.pushBidsToConvex(auctionResult.auctionId, auction.bids);
    }
  }

  /**
   * Push bid events to Convex
   */
  private async pushBidsToConvex(
    auctionId: string,
    bids: ParsedAuction["bids"]
  ): Promise<void> {
    if (!bids || bids.length === 0) return;

    const url = `${config.convexSiteUrl}/ingest/bids`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.scraperSecret}`,
      },
      body: JSON.stringify({
        bids: bids.map((b) => ({ ...b, auctionId })),
      }),
    });

    if (!response.ok) {
      console.warn(`[scraper] Bid ingest failed: ${response.status}`);
    }
  }

  /**
   * Log scrape result to Convex
   */
  private async logScrape(
    auctionId: string | null,
    status: string,
    errorMsg?: string,
    durationMs?: number
  ): Promise<void> {
    try {
      const url = `${config.convexSiteUrl}/ingest/scrape-log`;
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.scraperSecret}`,
        },
        body: JSON.stringify({
          auctionId,
          scrapedAt: Date.now(),
          status,
          errorMsg,
          durationMs,
        }),
      });
    } catch {
      // Non-critical — don't fail the scrape for logging issues
    }
  }

  /**
   * Rate limit: ensure minimum delay between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const delay = withJitter(config.minRequestDelay);

    if (elapsed < delay) {
      await new Promise((resolve) =>
        setTimeout(resolve, delay - elapsed)
      );
    }

    this.lastRequestTime = Date.now();
  }
}
