/* eslint-disable */
/**
 * Stub — will be overwritten by `npx convex dev`.
 * Exists so the frontend can build without a Convex deployment.
 */
import type { GenericId, GenericDocument } from "convex/values";

export type Doc<T extends string> = GenericDocument & { _id: GenericId<T> };
export type Id<T extends string> = GenericId<T>;
