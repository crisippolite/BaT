/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _internal from "../_internal.js";
import type * as auctions from "../auctions.js";
import type * as bids from "../bids.js";
import type * as cronHandlers from "../cronHandlers.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as market from "../market.js";
import type * as mlBridge from "../mlBridge.js";
import type * as predictions from "../predictions.js";
import type * as preferences from "../preferences.js";
import type * as scores from "../scores.js";
import type * as signals from "../signals.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _internal: typeof _internal;
  auctions: typeof auctions;
  bids: typeof bids;
  cronHandlers: typeof cronHandlers;
  crons: typeof crons;
  http: typeof http;
  ingest: typeof ingest;
  market: typeof market;
  mlBridge: typeof mlBridge;
  predictions: typeof predictions;
  preferences: typeof preferences;
  scores: typeof scores;
  signals: typeof signals;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
