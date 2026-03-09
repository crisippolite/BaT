// Scraper configuration

export const config = {
  // BaT URLs
  batBaseUrl: process.env.BAT_BASE_URL || "https://bringatrailer.com",
  batSearchUrl:
    process.env.BAT_SEARCH_URL || "https://bringatrailer.com/bmw/2002/",

  // Convex endpoints
  convexSiteUrl: process.env.CONVEX_SITE_URL || "",

  // Shared secret for authenticating with Convex HTTP actions
  scraperSecret: process.env.SCRAPER_SECRET || "",

  // Proxy configuration
  proxyUrl: process.env.PROXY_URL || "",

  // Health check server port
  port: parseInt(process.env.PORT || "3000", 10),

  // Scrape intervals by auction phase (milliseconds)
  intervals: {
    moreThan48h: 30 * 60 * 1000, // 30 min
    between24and48h: 15 * 60 * 1000, // 15 min
    between6and24h: 10 * 60 * 1000, // 10 min
    between1and6h: 5 * 60 * 1000, // 5 min
    finalHour: 2 * 60 * 1000, // 2 min
  },

  // Discovery interval
  discoveryInterval: 30 * 60 * 1000, // 30 min

  // Rate limiting
  minRequestDelay: 5000, // 5s between requests
  requestJitter: 0.2, // ±20% randomization

  // Browser settings
  headless: true,
  userAgents: [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  ],
} as const;

// Get a random user agent
export function getRandomUserAgent(): string {
  return config.userAgents[
    Math.floor(Math.random() * config.userAgents.length)
  ];
}

// Add jitter to a delay
export function withJitter(baseMs: number): number {
  const jitter = baseMs * config.requestJitter;
  return baseMs + (Math.random() * 2 - 1) * jitter;
}

// Determine scrape interval based on hours remaining
export function getIntervalForAuction(hoursRemaining: number): number {
  if (hoursRemaining <= 0) return 0;
  if (hoursRemaining < 1) return config.intervals.finalHour;
  if (hoursRemaining < 6) return config.intervals.between1and6h;
  if (hoursRemaining < 24) return config.intervals.between6and24h;
  if (hoursRemaining < 48) return config.intervals.between24and48h;
  return config.intervals.moreThan48h;
}
