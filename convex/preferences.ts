import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all profiles for the authenticated user
export const listProfiles = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// Get the active (isDefault) profile for the authenticated user
export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profiles = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    return profiles.find((p) => p.isDefault) ?? profiles[0] ?? null;
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

// Save preferences — updates existing profile or creates new one
export const save = mutation({
  args: {
    profileId: v.optional(v.id("userPreferences")),
    token: v.optional(v.string()),
    name: v.optional(v.string()),
    prefsJson: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity) {
      const userId = identity.subject;

      // If a specific profile ID is given, update that one
      if (args.profileId) {
        const existing = await ctx.db.get(args.profileId);
        if (existing && existing.userId === userId) {
          await ctx.db.patch(args.profileId, {
            prefsJson: args.prefsJson,
            name: args.name ?? existing.name,
          });
          return { id: args.profileId, userId };
        }
      }

      // Otherwise find active profile
      const profiles = await ctx.db
        .query("userPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      const active = profiles.find((p) => p.isDefault) ?? profiles[0];

      if (active) {
        await ctx.db.patch(active._id, {
          prefsJson: args.prefsJson,
          name: args.name ?? active.name,
        });
        return { id: active._id, userId };
      }

      // Check for legacy token-based record to migrate
      let legacyPrefs = null;
      if (args.token) {
        legacyPrefs = await ctx.db
          .query("userPreferences")
          .withIndex("by_token", (q) => q.eq("token", args.token))
          .first();
      }

      if (legacyPrefs) {
        await ctx.db.patch(legacyPrefs._id, {
          userId,
          prefsJson: args.prefsJson,
          name: args.name ?? legacyPrefs.name,
          isDefault: true,
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

// Create a new watch profile
export const createProfile = mutation({
  args: {
    name: v.string(),
    prefsJson: v.any(),
    setActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const userId = identity.subject;

    if (args.setActive) {
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      for (const profile of existing) {
        if (profile.isDefault) {
          await ctx.db.patch(profile._id, { isDefault: false });
        }
      }
    }

    const id = await ctx.db.insert("userPreferences", {
      name: args.name,
      isDefault: args.setActive ?? false,
      prefsJson: args.prefsJson,
      userId,
    });

    return { id };
  },
});

// Switch active profile
export const setActiveProfile = mutation({
  args: { profileId: v.id("userPreferences") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const userId = identity.subject;
    const target = await ctx.db.get(args.profileId);
    if (!target || target.userId !== userId) {
      throw new Error("Profile not found");
    }

    const all = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const profile of all) {
      if (profile.isDefault && profile._id !== args.profileId) {
        await ctx.db.patch(profile._id, { isDefault: false });
      }
    }

    await ctx.db.patch(args.profileId, { isDefault: true });
    return { id: args.profileId };
  },
});

// Delete a profile (cannot delete last one)
export const deleteProfile = mutation({
  args: { profileId: v.id("userPreferences") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const userId = identity.subject;
    const target = await ctx.db.get(args.profileId);
    if (!target || target.userId !== userId) {
      throw new Error("Profile not found");
    }

    const all = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (all.length <= 1) {
      throw new Error("Cannot delete your only profile");
    }

    await ctx.db.delete(args.profileId);

    if (target.isDefault) {
      const remaining = all.find((p) => p._id !== args.profileId);
      if (remaining) {
        await ctx.db.patch(remaining._id, { isDefault: true });
      }
    }

    return { deleted: true };
  },
});

// Rename a profile
export const renameProfile = mutation({
  args: {
    profileId: v.id("userPreferences"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const target = await ctx.db.get(args.profileId);
    if (!target || target.userId !== identity.subject) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(args.profileId, { name: args.name });
    return { id: args.profileId };
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
