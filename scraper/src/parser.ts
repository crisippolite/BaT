import type { Page } from "playwright";

// Types for parsed auction data
export interface ParsedAuction {
  batId: string;
  batUrl: string;
  title: string;
  year?: number;
  make?: string;
  model?: string;
  subtitle?: string;
  location?: string;
  sellerUsername?: string;
  description?: string;
  endTime?: number;
  status: string;
  currentBid?: number;
  bidCount?: number;
  finalPrice?: number;
  reserveStatus: string;
  imageUrl?: string;
  attributes?: ParsedAttributes;
  bids?: ParsedBid[];
}

export interface ParsedAttributes {
  engine?: string;
  transmission?: string;
  color?: string;
  mileage?: string;
  vin?: string;
  titleStatus?: string;
  rustNotes?: string;
  hasAc?: boolean;
  rawJson?: Record<string, unknown>;
}

export interface ParsedBid {
  bidAmount: number;
  bidCount?: number;
  reserveMet?: boolean;
  scrapedAt: number;
}

export interface DiscoveredListing {
  batId: string;
  batUrl: string;
  title: string;
  imageUrl?: string;
}

/**
 * Extract auction data from a BaT auction page.
 * BaT embeds auction data as a JSON object in a <script> tag.
 * We target this first before falling back to DOM scraping.
 */
export async function parseAuctionPage(
  page: Page,
  url: string
): Promise<ParsedAuction | null> {
  // Extract embedded JSON data first (more reliable)
  const embeddedData = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll("script")];
    const dataScript = scripts.find(
      (s) =>
        s.textContent?.includes("window.AUCTION_DATA") ||
        s.textContent?.includes("window.__AUCTION_DATA__")
    );
    if (dataScript) {
      const match = dataScript.textContent?.match(
        /window\.(?:__)?AUCTION_DATA(?:__)?s*=\s*({.+?});/s
      );
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Extract bat ID from URL
  const batId = extractBatId(url);
  if (!batId) return null;

  if (embeddedData) {
    return parseFromEmbeddedData(embeddedData, batId, url);
  }

  // Fallback: DOM scraping
  return parseFromDOM(page, batId, url);
}

/**
 * Parse auction data from the embedded JSON object
 */
function parseFromEmbeddedData(
  data: Record<string, unknown>,
  batId: string,
  url: string
): ParsedAuction {
  const now = Date.now();

  return {
    batId,
    batUrl: url,
    title: (data.title as string) || "",
    year: data.year ? Number(data.year) : undefined,
    make: (data.make as string) || undefined,
    model: (data.model as string) || undefined,
    subtitle: data.subtitle as string | undefined,
    location: data.location as string | undefined,
    sellerUsername: data.seller_username as string | undefined,
    description: data.description as string | undefined,
    endTime: data.end_date ? new Date(data.end_date as string).getTime() : undefined,
    status: inferStatus(data),
    currentBid: data.current_bid ? Number(data.current_bid) : undefined,
    bidCount: data.bid_count ? Number(data.bid_count) : undefined,
    finalPrice: data.sold_price ? Number(data.sold_price) : undefined,
    reserveStatus: inferReserveStatus(data),
    imageUrl: data.image_url as string | undefined,
    attributes: parseAttributes(data),
    bids: parseBids(data, now),
  };
}

/**
 * Fallback DOM scraping when embedded JSON is not available
 */
async function parseFromDOM(
  page: Page,
  batId: string,
  url: string
): Promise<ParsedAuction> {
  const data = await page.evaluate(() => {
    const title =
      document.querySelector("h1.post-title")?.textContent?.trim() || "";
    const bidEl = document.querySelector(".bid-value, .current-bid");
    const currentBid = bidEl?.textContent?.replace(/[$,]/g, "");

    return {
      title,
      currentBid: currentBid ? parseInt(currentBid, 10) : undefined,
      // Add more DOM selectors as BaT's structure is analyzed
    };
  });

  return {
    batId,
    batUrl: url,
    title: data.title,
    status: "active",
    currentBid: data.currentBid,
    reserveStatus: "unknown",
  };
}

/**
 * Parse the BaT search/listing page to discover new auctions
 */
export async function parseSearchPage(
  page: Page
): Promise<DiscoveredListing[]> {
  return await page.evaluate(() => {
    const listings: Array<{
      batId: string;
      batUrl: string;
      title: string;
      imageUrl?: string;
    }> = [];

    // BaT renders auction cards in a grid
    const cards = document.querySelectorAll(
      ".auction-item, .listing-card, [data-auction-id]"
    );

    cards.forEach((card) => {
      const link = card.querySelector("a[href]") as HTMLAnchorElement | null;
      const img = card.querySelector("img") as HTMLImageElement | null;
      const titleEl = card.querySelector(
        ".auction-title, .listing-title, h3"
      );

      if (link?.href) {
        const urlMatch = link.href.match(
          /bringatrailer\.com\/listing\/([^/?]+)/
        );
        if (urlMatch) {
          listings.push({
            batId: `bat-${urlMatch[1]}`,
            batUrl: link.href,
            title: titleEl?.textContent?.trim() || "",
            imageUrl: img?.src,
          });
        }
      }
    });

    return listings;
  });
}

// --- Helper functions ---

function extractBatId(url: string): string | null {
  const match = url.match(/bringatrailer\.com\/listing\/([^/?]+)/);
  return match ? `bat-${match[1]}` : null;
}

function inferStatus(data: Record<string, unknown>): string {
  if (data.sold_price) return "ended";
  if (data.status === "no_sale" || data.reserve_not_met) return "no_sale";
  return "active";
}

function inferReserveStatus(data: Record<string, unknown>): string {
  if (data.reserve_met === true) return "met";
  if (data.reserve_met === false || data.reserve_not_met === true)
    return "not_met";
  return "unknown";
}

function parseAttributes(
  data: Record<string, unknown>
): ParsedAttributes {
  const attrs: ParsedAttributes = {
    rawJson: data as Record<string, unknown>,
  };

  // Extract known fields from various possible locations in the data
  if (data.engine) attrs.engine = String(data.engine);
  if (data.transmission) attrs.transmission = String(data.transmission);
  if (data.color || data.exterior_color)
    attrs.color = String(data.color || data.exterior_color);
  if (data.mileage) attrs.mileage = String(data.mileage);
  if (data.vin) attrs.vin = String(data.vin);
  if (data.title_status) attrs.titleStatus = String(data.title_status);

  // Check for AC in features or description
  const description = String(data.description || "").toLowerCase();
  attrs.hasAc =
    description.includes("air conditioning") ||
    description.includes("a/c") ||
    description.includes(" ac ");

  return attrs;
}

function parseBids(
  data: Record<string, unknown>,
  scrapedAt: number
): ParsedBid[] {
  const bids: ParsedBid[] = [];

  // BaT may include bid history in the embedded data
  const bidHistory = data.bids as
    | Array<Record<string, unknown>>
    | undefined;
  if (Array.isArray(bidHistory)) {
    for (const bid of bidHistory) {
      bids.push({
        bidAmount: Number(bid.amount || bid.bid_amount || 0),
        reserveMet: bid.reserve_met as boolean | undefined,
        scrapedAt,
      });
    }
  }

  // If no bid history, create a single entry from current bid
  if (bids.length === 0 && data.current_bid) {
    bids.push({
      bidAmount: Number(data.current_bid),
      bidCount: data.bid_count ? Number(data.bid_count) : undefined,
      scrapedAt,
    });
  }

  return bids;
}
