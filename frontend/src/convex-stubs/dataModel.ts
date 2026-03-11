/* eslint-disable */
/**
 * Stub — will be overwritten by `npx convex dev`.
 * Exists so the frontend can build without a running Convex dev server.
 */
import type { GenericId } from "convex/values";

export type Doc<T extends string> = Record<string, any> & { _id: GenericId<T> };
export type Id<T extends string> = GenericId<T>;
