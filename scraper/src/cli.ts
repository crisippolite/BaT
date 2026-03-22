#!/usr/bin/env node
/**
 * CLI for testing BaT scraping without Convex or Playwright.
 * Uses plain fetch + HTML parsing for proof-of-concept.
 *
 * Usage:
 *   npx tsx src/cli.ts scrape <bat-listing-url>
 *   npx tsx src/cli.ts discover [search-url]
 *
 * Examples:
 *   npx tsx src/cli.ts scrape https://bringatrailer.com/listing/1973-bmw-2002tii-27/
 *   npx tsx src/cli.ts discover https://bringatrailer.com/bmw/2002/
 *   npx tsx src/cli.ts discover   # defaults to BMW 2002
 */

import { getRandomUserAgent } from "./config.js";

const DEFAULT_SEARCH = "https://bringatrailer.com/bmw/2002/";

// --- Fetch helpers ---

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }

  return res.text();
}

// --- Auction page parsing (no browser needed) ---

function parseAuctionHtml(html: string, url: string) {
  // Try to extract embedded JSON first
  const jsonMatch = html.match(
    /window\.(?:__)?AUCTION_DATA(?:__)?s*=\s*({.+?});/s
  );
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      console.log("[cli] Found embedded AUCTION_DATA JSON");
      return formatEmbeddedData(data, url);
    } catch {
      console.log("[cli] Found AUCTION_DATA but failed to parse JSON");
    }
  }

  // Fallback: regex-based HTML scraping
  console.log("[cli] No embedded JSON — falling back to HTML parsing");

  const title =
    extractFirst(html, /<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>(.*?)<\/h1>/s) ||
    extractFirst(html, /<h1[^>]*>(.*?)<\/h1>/s) ||
    extractFirst(html, /<title>(.*?)(?:\s*[-|].*)?<\/title>/);

  const currentBidText =
    extractFirst(html, /class="[^"]*bid-value[^"]*"[^>]*>\s*\$?([\d,]+)/s) ||
    extractFirst(html, /class="[^"]*current-bid[^"]*"[^>]*>\s*\$?([\d,]+)/s) ||
    extractFirst(html, /Current Bid[^<]*<[^>]*>\s*\$?([\d,]+)/s);
  const currentBid = currentBidText
    ? parseInt(currentBidText.replace(/,/g, ""), 10)
    : undefined;

  const bidCountText = extractFirst(
    html,
    /(\d+)\s*(?:bid|comment)/i
  );
  const bidCount = bidCountText ? parseInt(bidCountText, 10) : undefined;

  // Sold price (ended auctions)
  const soldText =
    extractFirst(html, /Sold\s*(?:for)?\s*\$?([\d,]+)/i) ||
    extractFirst(html, /sold_price['"]\s*:\s*['"]([\d,]+)/);
  const finalPrice = soldText
    ? parseInt(soldText.replace(/,/g, ""), 10)
    : undefined;

  // Status
  let status = "active";
  if (finalPrice) status = "ended";
  else if (/bid\s*to\s*\$.*not\s*met/i.test(html) || /no.sale/i.test(html))
    status = "no_sale";
  else if (/auction.ended/i.test(html) || /sold/i.test(html))
    status = "ended";

  // Image
  const imageUrl =
    extractFirst(
      html,
      /<meta\s+property="og:image"\s+content="([^"]+)"/
    ) || extractFirst(html, /<img[^>]+class="[^"]*featured[^"]*"[^>]+src="([^"]+)"/);

  // Essentials table (BaT has a key-value essentials section)
  const essentials = parseEssentialsTable(html);

  // Extract bat ID from URL
  const batIdMatch = url.match(/\/listing\/([^/?]+)/);
  const batId = batIdMatch ? `bat-${batIdMatch[1]}` : "unknown";

  return {
    batId,
    batUrl: url,
    title: cleanHtml(title || ""),
    status,
    currentBid,
    bidCount,
    finalPrice,
    imageUrl,
    essentials,
  };
}

function parseEssentialsTable(html: string): Record<string, string> {
  const essentials: Record<string, string> = {};

  // BaT uses a table-like layout with dt/dd or th/td for essentials
  const pairs = [
    ...html.matchAll(
      /<(?:dt|th|strong)[^>]*>(.*?)<\/(?:dt|th|strong)>\s*<(?:dd|td|span)[^>]*>(.*?)<\/(?:dd|td|span)>/gs
    ),
  ];

  for (const [, key, value] of pairs) {
    const cleanKey = cleanHtml(key).toLowerCase().trim();
    const cleanVal = cleanHtml(value).trim();
    if (cleanKey && cleanVal) {
      essentials[cleanKey] = cleanVal;
    }
  }

  return essentials;
}

// --- Search/discovery page parsing ---

function parseSearchHtml(html: string) {
  const listings: Array<{
    batId: string;
    batUrl: string;
    title: string;
  }> = [];

  // Find all listing links
  const linkMatches = html.matchAll(
    /href="(https?:\/\/bringatrailer\.com\/listing\/([^"/?]+)\/?)"[^>]*>([^<]*)/g
  );

  const seen = new Set<string>();
  for (const [, href, slug, text] of linkMatches) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    listings.push({
      batId: `bat-${slug}`,
      batUrl: href,
      title: cleanHtml(text).trim() || slug,
    });
  }

  return listings;
}

// --- Utilities ---

function extractFirst(
  html: string,
  re: RegExp
): string | undefined {
  const m = html.match(re);
  return m?.[1];
}

function cleanHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// --- Format embedded data ---

function formatEmbeddedData(
  data: Record<string, unknown>,
  url: string
) {
  const batIdMatch = url.match(/\/listing\/([^/?]+)/);
  const batId = batIdMatch ? `bat-${batIdMatch[1]}` : "unknown";

  return {
    batId,
    batUrl: url,
    title: data.title || "",
    year: data.year,
    make: data.make,
    model: data.model,
    location: data.location,
    sellerUsername: data.seller_username,
    status: data.sold_price ? "ended" : "active",
    currentBid: data.current_bid,
    bidCount: data.bid_count,
    finalPrice: data.sold_price,
    reserveStatus: data.reserve_met === true ? "met" : "unknown",
    imageUrl: data.image_url,
    engine: data.engine,
    transmission: data.transmission,
    color: data.color || data.exterior_color,
    mileage: data.mileage,
    vin: data.vin,
  };
}

// --- Commands ---

async function scrapeOne(url: string) {
  console.log(`\n[cli] Fetching: ${url}\n`);
  const start = Date.now();

  const html = await fetchPage(url);
  const elapsed = Date.now() - start;
  console.log(`[cli] Got ${html.length} bytes in ${elapsed}ms\n`);

  const data = parseAuctionHtml(html, url);

  console.log("[cli] Parsed auction data:\n");
  console.log(JSON.stringify(data, null, 2));
}

async function discoverListings(searchUrl: string) {
  console.log(`\n[cli] Discovering listings from: ${searchUrl}\n`);
  const start = Date.now();

  const html = await fetchPage(searchUrl);
  const elapsed = Date.now() - start;
  console.log(`[cli] Got ${html.length} bytes in ${elapsed}ms\n`);

  const listings = parseSearchHtml(html);

  if (listings.length > 0) {
    console.log(`[cli] Found ${listings.length} listing(s):\n`);
    for (const l of listings) {
      console.log(`  ${l.title}`);
      console.log(`    ${l.batUrl}\n`);
    }
  } else {
    console.log("[cli] No listings found on page.");

    // Show page title for debugging
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    console.log(`[cli] Page title: ${cleanHtml(titleMatch?.[1] || "(none)")}`);
  }
}

// --- Main ---
const [command, ...args] = process.argv.slice(2);

if (command === "scrape" && args[0]) {
  scrapeOne(args[0]).catch(console.error);
} else if (command === "discover") {
  discoverListings(args[0] || DEFAULT_SEARCH).catch(console.error);
} else {
  console.log(`
BaT Signal CLI — proof-of-concept scraper

Usage:
  npx tsx src/cli.ts scrape  <auction-url>    Scrape a single auction page
  npx tsx src/cli.ts discover [search-url]    Discover listings (default: BMW 2002)

Examples:
  npx tsx src/cli.ts scrape https://bringatrailer.com/listing/1973-bmw-2002tii-27/
  npx tsx src/cli.ts discover https://bringatrailer.com/bmw/2002/
  npx tsx src/cli.ts discover
`);
}
