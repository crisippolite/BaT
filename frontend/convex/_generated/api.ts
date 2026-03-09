/* eslint-disable */
/**
 * Stub — will be overwritten by `npx convex dev`.
 * Exists so the frontend can build without a Convex deployment.
 */
import type { FilterApi, FunctionReference } from "convex/server";

const fullApi = {} as any;

export const api: FilterApi<typeof fullApi, FunctionReference<any, "public">> =
  fullApi as any;
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = fullApi as any;
