import { httpRouter } from "convex/server";
import { upsertAuction, insertBids, logScrape, storePrediction, exportTrainingData } from "./ingest";

const http = httpRouter();

// Scraper ingestion endpoints
http.route({
  path: "/ingest/auction",
  method: "POST",
  handler: upsertAuction,
});

http.route({
  path: "/ingest/bids",
  method: "POST",
  handler: insertBids,
});

http.route({
  path: "/ingest/scrape-log",
  method: "POST",
  handler: logScrape,
});

// ML service prediction endpoint
http.route({
  path: "/ingest/prediction",
  method: "POST",
  handler: storePrediction,
});

// Training data export for ML service
http.route({
  path: "/export/training-data",
  method: "GET",
  handler: exportTrainingData,
});

export default http;
