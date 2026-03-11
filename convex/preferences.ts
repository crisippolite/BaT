import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get preferences for the authenticated user
export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

// Get preferences by anonymous token (legacy)
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

// Save preferences (works for both authenticated and anonymous users)
export const save = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.optional(v.string()),
    prefsJson: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Authenticated user flow
    if (identity) {
      const userId = identity.subject;
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          prefsJson: args.prefsJson,
          name: args.name ?? existing.name,
        });
        return { id: existing._id, userId };
      } else {
        // Check if there's a legacy token-based record to migrate
        let legacyPrefs = null;
        if (args.token) {
          legacyPrefs = await ctx.db
            .query("userPreferences")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();
        }

        if (legacyPrefs) {
          // Migrate: attach userId to existing record
          await ctx.db.patch(legacyPrefs._id, {
            userId,
            prefsJson: args.prefsJson,
            name: args.name ?? legacyPrefs.name,
          });
          return { id: legacyPrefs._id, userId };
        }

        const id = await ctx.db.insert("userPreferences", {
          name: args.name ?? identity.name ?? "Default",
          isDefault: true,
          prefsJson: args.prefsJson,
          userId,
        });
        return { id, userId };
      }
    }

    // Anonymous fallback (legacy)
    const token =
      args.token ?? Math.random().toString(36).substring(2) + Date.now().toString(36);

    const existing = args.token
      ? await ctx.db
          .query("userPreferences")
          .withIndex("by_token", (q) => q.eq("token", args.token))
          .first()
      : null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        prefsJson: args.prefsJson,
        name: args.name ?? existing.name,
      });
      return { id: existing._id, token };
    } else {
      const id = await ctx.db.insert("userPreferences", {
        name: args.name ?? "Default",
        isDefault: true,
        prefsJson: args.prefsJson,
        token,
      });
      return { id, token };
    }
  },
});

// Get default preference template
export const getDefaults = query({
  handler: async () => {
    return {
      version: 1,
      passFailCriteria: {
        noStructuralRust: true,
        pre1976: true,
        cleanTitle: true,
      },
      bonusWeights: {
        has_ac: 5,
        has_5_speed: 2,
        s14_swap: 2,
        widebody: 2,
        m42_swap: 1,
        recaro_seats: 1,
        track_suspension: 1,
        lightweight_wheels: 1,
        round_taillights: 1,
        ducktail_spoiler: 1,
        front_air_dam: 1,
        rebuilt_transmission: 1,
        custom_shifter: 1,
      },
      alerts: {
        newMatch: true,
        reserveRisk: true,
        lastHour: true,
        highSnipeRisk: false,
      },
      searchProfile: {
        yearMin: 1966,
        yearMax: 1975,
        priceMax: 50000,
        keywords: ["tii", "5-speed", "rust-free"],
      },
    };
  },
});
