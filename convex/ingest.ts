import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Verify scraper secret from request header
function verifySecret(request: Request, envSecret: string | undefined): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !envSecret) return false;
  return authHeader === `Bearer ${envSecret}`;
}

// HTTP action: upsert auction data from scraper
export const upsertAuction = httpAction(async (ctx, request) => {
  const secret = process.env.SCRAPER_SECRET;
  if (!verifySecret(request, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const auctionId = await ctx.runMutation(internal.auctions.internalUpsert, {
      batId: body.batId,
      batUrl: body.batUrl,
      title: body.title,
      year: body.year ?? undefined,
      make: body.make ?? "BMW",
      model: body.model ?? "2002",
      subtitle: body.subtitle ?? undefined,
      location: body.location ?? undefined,
      sellerUsername: body.sellerUsername ?? undefined,
      description: body.description ?? undefined,
      endTime: body.endTime ?? undefined,
      status: body.status ?? "active",
      currentBid: body.currentBid ?? undefined,
      bidCount: body.bidCount ?? undefined,
      finalPrice: body.finalPrice ?? undefined,
      reserveStatus: body.reserveStatus ?? "unknown",
      imageUrl: body.imageUrl ?? undefined,
    });

    // If attributes are included, upsert them too
    if (body.attributes) {
      await ctx.runMutation(internal._internal.internalUpsertAttributes, {
        auctionId,
        ...body.attributes,
      });
    }

    // Trigger ML prediction in the background (fire-and-forget)
    await ctx.scheduler.runAfter(0, internal.mlBridge.requestPrediction, {
      auctionId: auctionId as Id<"auctions">,
    });

    return new Response(JSON.stringify({ auctionId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// HTTP action: insert bid events from scraper
export const insertBids = httpAction(async (ctx, request) => {
  const secret = process.env.SCRAPER_SECRET;
  if (!verifySecret(request, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await ctx.runMutation(internal.bids.internalInsertBids, {
      bids: body.bids,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// HTTP action: log scrape result
export const logScrape = httpAction(async (ctx, request) => {
  const secret = process.env.SCRAPER_SECRET;
  if (!verifySecret(request, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    await ctx.runMutation(internal._internal.internalLogScrape, {
      auctionId: body.auctionId ?? undefined,
      scrapedAt: body.scrapedAt ?? Date.now(),
      status: body.status,
      errorMsg: body.errorMsg ?? undefined,
      durationMs: body.durationMs ?? undefined,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// HTTP action: export completed auction data for ML training
export const exportTrainingData = httpAction(async (ctx, request) => {
  const secret = process.env.SCRAPER_SECRET;
  if (!verifySecret(request, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const data = await ctx.runQuery(internal.mlBridge.getTrainingData);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// HTTP action: receive prediction from ML service
export const storePrediction = httpAction(async (ctx, request) => {
  const secret = process.env.SCRAPER_SECRET;
  if (!verifySecret(request, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    await ctx.runMutation(internal.predictions.store, {
      auctionId: body.auctionId,
      predictedAt: body.predictedAt ?? Date.now(),
      modelVersion: body.modelVersion,
      predictedFinal: body.predictedFinal,
      confidenceLow: body.confidenceLow,
      confidenceHigh: body.confidenceHigh,
      featuresJson: body.featuresJson ?? undefined,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
